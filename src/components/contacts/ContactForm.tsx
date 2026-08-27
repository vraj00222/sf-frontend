"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import Field from "@/components/ui/Field";
import Button, { buttonClasses } from "@/components/ui/Button";
import AddressListField from "@/components/contacts/AddressListField";
import PhotoField from "@/components/contacts/PhotoField";
import {
  CONTACT_FIELD_GROUPS,
  type ContactFieldGroup,
  type ScalarFieldName,
} from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  type AddressFormValues,
  type Contact,
  type FormState,
} from "@/lib/contacts/types";

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({ label, busy }: { label: string; busy?: boolean }) {
  const { pending } = useFormStatus();
  // `busy` is the photo still being read: submitting now would post the previous
  // value, because the hidden input only updates once the read resolves.
  const waiting = pending || busy;

  return (
    <Button type="submit" disabled={waiting}>
      {waiting ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : busy ? "Processing photo…" : label}
    </Button>
  );
}

/** One titled form section: hidden legend, visible header, then the controls. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">{title}</legend>

      <div className="border-b border-hairline pb-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>

      {children}
    </fieldset>
  );
}

/**
 * Create/edit form. Scalar fields come from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action, so scalar submits still work before
 * hydration; the photo picker and the address list are client widgets that
 * feed the same plain form data. Errors come back through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const [photoBusy, setPhotoBusy] = useState(false);

  function valueFor(name: ScalarFieldName): string {
    return state.values?.[name] ?? contact?.[name] ?? "";
  }

  function fieldGroup(group: ContactFieldGroup) {
    return (
      <Section key={group.title} title={group.title} description={group.description}>
        <div className="grid gap-4 sm:grid-cols-2">
          {group.fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              defaultValue={valueFor(field.name)}
              error={state.fieldErrors?.[field.name]}
            />
          ))}
        </div>
      </Section>
    );
  }

  const initialAddresses: AddressFormValues[] =
    state.values?.addresses ??
    contact?.addresses.map((address) => ({
      type: address.type,
      street: address.street ?? "",
      city: address.city ?? "",
      state: address.state ?? "",
      postal_code: address.postal_code ?? "",
      country: address.country ?? "",
    })) ??
    [];

  // Addresses sit before the Notes group when there is one; the editor renders
  // regardless, so a renamed or reordered group can never drop it (and with it,
  // on the next full-replace save, the contact's stored addresses).
  const notesGroup = CONTACT_FIELD_GROUPS.find((group) => group.title === "Notes");
  const mainGroups = CONTACT_FIELD_GROUPS.filter((group) => group !== notesGroup);

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      <Section
        title="Photo"
        description="Optional profile picture, shown as a circular avatar."
      >
        <PhotoField
          initialPhoto={state.values?.photo ?? contact?.photo ?? null}
          error={state.fieldErrors?.photo}
          onBusyChange={setPhotoBusy}
        />
      </Section>

      {mainGroups.map(fieldGroup)}

      <Section
        title="Addresses"
        description="As many as needed, each marked Home, Work, or Other."
      >
        <AddressListField
          initial={initialAddresses}
          fieldErrors={state.fieldErrors}
        />
      </Section>

      {notesGroup ? fieldGroup(notesGroup) : null}

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} busy={photoBusy} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
