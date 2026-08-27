"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { MapPin, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { CONTROL } from "@/components/ui/Field";
import { ADDRESS_FIELDS, EMPTY_ADDRESS, MAX_ADDRESSES } from "@/lib/contacts/schema";
import { ADDRESS_TYPES, type AddressFormValues } from "@/lib/contacts/types";

type Entry = {
  key: number;
  values: AddressFormValues;
  /** Errors from the last failed submit, captured while positions still match. */
  errors?: Record<string, string>;
};

const BLANK: AddressFormValues = { ...EMPTY_ADDRESS, type: "Home" };

/** The `addresses.<i>.<field>` errors for one entry, keyed by field name. */
function errorsForIndex(
  fieldErrors: Record<string, string> | undefined,
  index: number,
): Record<string, string> | undefined {
  if (!fieldErrors) return undefined;
  const prefix = `addresses.${index}.`;
  const entries = Object.entries(fieldErrors)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, message]) => [key.slice(prefix.length), message]);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/**
 * Editable list of address entries. Each entry posts as indexed inputs
 * (`addresses.<n>.<field>`) that `formDataToValues` reassembles, so the form
 * still submits as plain form data. Inputs are controlled: React 19 resets a
 * form's uncontrolled inputs after every action, which would silently discard
 * the user's edits on a failed submit. Submit errors are captured onto their
 * entries while indexes still line up, so removing an entry afterwards keeps
 * each error on the address it belongs to.
 */
export default function AddressListField({
  initial,
  fieldErrors,
}: {
  initial: AddressFormValues[];
  fieldErrors?: Record<string, string>;
}) {
  // Returned errors are positional (`addresses.<i>.<field>`) and are matched to
  // entries by index. Adding or removing while a submit is in flight would shift
  // the list out from under them, landing an error on the wrong address, so list
  // mutation is locked until the response arrives.
  const { pending } = useFormStatus();
  const nextKey = useRef(initial.length);
  const [entries, setEntries] = useState<Entry[]>(
    initial.map((values, key) => ({ key, values })),
  );

  // New submit outcome → re-attach errors positionally (positions at submit
  // time are these positions, since submitting re-indexes the live entries).
  const [seenErrors, setSeenErrors] = useState(fieldErrors);
  if (fieldErrors !== seenErrors) {
    setSeenErrors(fieldErrors);
    setEntries((current) =>
      current.map((entry, index) => ({
        ...entry,
        errors: errorsForIndex(fieldErrors, index),
      })),
    );
  }

  function addEntry() {
    setEntries((current) => [
      ...current,
      { key: nextKey.current++, values: BLANK },
    ]);
  }

  function removeEntry(key: number) {
    setEntries((current) => current.filter((entry) => entry.key !== key));
  }

  function setValue(key: number, field: keyof AddressFormValues, value: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.key === key
          ? // Drop the whole entry's errors, not just this field's. Some are
            // cross-field ("fill in at least one address field") and are
            // attached to a single input, so editing any field in the entry can
            // make them obsolete. They come back on the next failed submit.
            { ...entry, values: { ...entry.values, [field]: value }, errors: undefined }
          : entry,
      ),
    );
  }

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-[13px] text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          No addresses yet. A contact can have several — home, work, or other.
        </p>
      ) : null}

      {entries.map((entry, index) => {
        const typeId = `address-${entry.key}-type`;
        const typeError = entry.errors?.type;

        return (
          <div
            key={entry.key}
            className="space-y-4 rounded-lg border border-border bg-card/50 p-4"
          >
            <div className="flex items-end justify-between gap-2">
              <div className="w-40">
                <label
                  htmlFor={typeId}
                  className="mb-1.5 block text-[13px] font-medium text-foreground"
                >
                  Type
                </label>
                <select
                  id={typeId}
                  name={`addresses.${index}.type`}
                  value={entry.values.type}
                  onChange={(event) => setValue(entry.key, "type", event.target.value)}
                  className={`${CONTROL} ${typeError ? "border-destructive" : "border-border focus:border-primary"}`}
                >
                  {ADDRESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(entry.key)}
                disabled={pending}
                aria-label={`Remove address ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Remove
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {ADDRESS_FIELDS.map((field) => {
                const id = `address-${entry.key}-${field.name}`;
                const errorId = `${id}-error`;
                const error = entry.errors?.[field.name];

                return (
                  <div key={field.name} className={field.wide ? "sm:col-span-2" : undefined}>
                    <label
                      htmlFor={id}
                      className="mb-1.5 block text-[13px] font-medium text-foreground"
                    >
                      {field.label}
                    </label>
                    <input
                      id={id}
                      type="text"
                      name={`addresses.${index}.${field.name}`}
                      value={entry.values[field.name]}
                      onChange={(event) =>
                        setValue(entry.key, field.name, event.target.value)
                      }
                      maxLength={field.maxLength}
                      placeholder={field.placeholder}
                      autoComplete={field.autoComplete}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                      className={`${CONTROL} ${error ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"}`}
                    />
                    {error ? (
                      <p id={errorId} role="alert" className="mt-1.5 text-[13px] text-destructive">
                        {error}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={addEntry}
        disabled={pending || entries.length >= MAX_ADDRESSES}
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Add address
      </Button>
    </div>
  );
}
