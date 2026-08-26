"use client";

import { useRef, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { CONTROL } from "@/components/ui/Field";
import { ADDRESS_FIELDS, MAX_ADDRESSES } from "@/lib/contacts/schema";
import { ADDRESS_TYPES, type AddressFormValues } from "@/lib/contacts/types";

type Entry = { key: number; values: AddressFormValues };

const BLANK: AddressFormValues = {
  type: "Home",
  street: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

/**
 * Editable list of address entries. Each entry posts as indexed inputs
 * (`addresses.<n>.<field>`) that `formDataToValues` reassembles, so the form
 * still submits as plain form data. Entries keep a stable React key so removal
 * in the middle doesn't shuffle the values typed into the ones below.
 */
export default function AddressListField({
  initial,
  fieldErrors,
}: {
  initial: AddressFormValues[];
  fieldErrors?: Record<string, string>;
}) {
  const nextKey = useRef(initial.length);
  const [entries, setEntries] = useState<Entry[]>(
    initial.map((values, key) => ({ key, values })),
  );

  function addEntry() {
    setEntries((current) => [
      ...current,
      { key: nextKey.current++, values: BLANK },
    ]);
  }

  function removeEntry(key: number) {
    setEntries((current) => current.filter((entry) => entry.key !== key));
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
        const typeError = fieldErrors?.[`addresses.${index}.type`];

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
                  defaultValue={entry.values.type || "Home"}
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
                const error = fieldErrors?.[`addresses.${index}.${field.name}`];

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
                      defaultValue={entry.values[field.name]}
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
        disabled={entries.length >= MAX_ADDRESSES}
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Add address
      </Button>
    </div>
  );
}
