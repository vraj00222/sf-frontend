import { z } from "zod";
import { ADDRESS_TYPES, type ContactInput } from "./types";
import type { AddressFormValues, ContactFormSnapshot } from "./types";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

/** Mirrors the API's photo rules: image data URL, at most 2 MB decoded. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
// The payload must be whole four-character base64 groups, optionally ending in a
// padded group. `[A-Za-z0-9+/]+={0,2}` would accept a stray "A", which decodes to
// nothing and would only be caught once the API rejected it.
const PHOTO_DATA_URL =
  /^data:image\/(png|jpeg|gif|webp);base64,(?:(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)|(?:[A-Za-z0-9+/]{4})+)$/;

/** Decoded size of a base64 data URL, from the payload length. */
export function photoByteSize(dataUrl: string): number {
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

/** Cap mirrored from the API's `MAX_ADDRESSES`. */
export const MAX_ADDRESSES = 20;

export const addressInputSchema = z
  .object({
    type: z.enum(ADDRESS_TYPES, "Choose Home, Work, or Other"),
    street: optionalText(300, "Street address"),
    city: optionalText(120, "City"),
    state: optionalText(120, "State"),
    postal_code: optionalText(20, "Postal code"),
    country: optionalText(120, "Country"),
  })
  .refine(
    (address) =>
      [
        address.street,
        address.city,
        address.state,
        address.postal_code,
        address.country,
      ].some(Boolean),
    { message: "Fill in at least one address field", path: ["street"] },
  );

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  addresses: z
    .array(addressInputSchema)
    .max(MAX_ADDRESSES, `A contact can have at most ${MAX_ADDRESSES} addresses`)
    .default([]),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
  photo: z
    .string()
    .transform((value) => value || null)
    .nullable()
    .default(null)
    .refine(
      (value) => value === null || PHOTO_DATA_URL.test(value),
      "Photo must be a PNG, JPEG, GIF, or WebP image",
    )
    .refine(
      (value) => value === null || photoByteSize(value) <= MAX_PHOTO_BYTES,
      "Photo must be 2 MB or smaller",
    ),
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/**
 * Collapse a ZodError into one message per field, keyed by input name —
 * `email` for scalars, `addresses.0.city` for an address entry's field.
 */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

/** Scalar inputs only — the photo and address list have their own widgets. */
export type ScalarFieldName = Exclude<keyof ContactInput, "addresses" | "photo">;

export interface ContactFieldSpec {
  name: ScalarFieldName;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

/** The text inputs of one address entry, rendered by `AddressListField`. */
export const ADDRESS_FIELDS: {
  name: Exclude<keyof AddressFormValues, "type">;
  label: string;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  wide?: boolean;
}[] = [
  {
    name: "street",
    label: "Street address",
    maxLength: 300,
    placeholder: "1 Market St, Suite 400",
    autoComplete: "street-address",
    wide: true,
  },
  {
    name: "city",
    label: "City",
    maxLength: 120,
    placeholder: "San Francisco",
    autoComplete: "address-level2",
  },
  {
    name: "state",
    label: "State / region",
    maxLength: 120,
    placeholder: "CA",
    autoComplete: "address-level1",
  },
  {
    name: "postal_code",
    label: "Postal code",
    maxLength: 20,
    placeholder: "94105",
    autoComplete: "postal-code",
  },
  {
    name: "country",
    label: "Country",
    maxLength: 120,
    placeholder: "USA",
    autoComplete: "country-name",
  },
];

export const EMPTY_ADDRESS: AddressFormValues = {
  type: "",
  street: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

// The field-name allow-list is `EMPTY_ADDRESS`'s keys, so adding a field there
// is enough — the regex doesn't need to repeat the names.
const ADDRESS_ENTRY_KEY = /^addresses\.(\d+)\.(\w+)$/;

/**
 * Pull the contact fields out of a submitted form, as raw strings.
 *
 * Scalars come from `CONTACT_FIELDS`, the photo from `PhotoField`'s hidden
 * input, and addresses from `AddressListField`'s indexed inputs
 * (`addresses.<n>.<field>`), reassembled in index order.
 */
export function formDataToValues(formData: FormData): ContactFormSnapshot {
  const byIndex = new Map<number, AddressFormValues>();
  for (const [key, value] of formData.entries()) {
    const match = ADDRESS_ENTRY_KEY.exec(key);
    if (!match || !(match[2] in EMPTY_ADDRESS)) continue;
    const index = Number(match[1]);
    const entry = byIndex.get(index) ?? { ...EMPTY_ADDRESS };
    entry[match[2] as keyof AddressFormValues] = String(value);
    byIndex.set(index, entry);
  }

  return {
    ...(Object.fromEntries(
      CONTACT_FIELDS.map((field) => [
        field.name,
        String(formData.get(field.name) ?? ""),
      ]),
    ) as Record<ScalarFieldName, string>),
    photo: String(formData.get("photo") ?? ""),
    addresses: [...byIndex.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, entry]) => entry),
  };
}
