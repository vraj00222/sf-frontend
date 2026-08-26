"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { Fragment } from "react";
import Field from "@/components/ui/Field";
import Button, { buttonClasses } from "@/components/ui/Button";
import AddressListField from "@/components/contacts/AddressListField";
import PhotoField from "@/components/contacts/PhotoField";
import { CONTACT_FIELD_GROUPS, type ScalarFieldName } from "@/lib/contacts/schema";
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

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
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

      <fieldset className="space-y-4">
        <legend className="sr-only">Photo</legend>

        <div className="border-b border-hairline pb-2">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Photo
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Optional profile picture, shown as a circular avatar.
          </p>
        </div>

        <PhotoField
          initialPhoto={state.values?.photo ?? contact?.photo ?? null}
          error={state.fieldErrors?.photo}
          onBusyChange={setPhotoBusy}
        />
      </fieldset>

      {CONTACT_FIELD_GROUPS.map((group) => (
        <Fragment key={group.title}>
          {group.title === "Notes" ? (
            <fieldset className="space-y-4">
              <legend className="sr-only">Addresses</legend>

              <div className="border-b border-hairline pb-2">
                <h2 className="font-display text-sm font-semibold text-foreground">
                  Addresses
                </h2>
                <p className="text-[13px] text-muted-foreground">
                  As many as needed, each marked Home, Work, or Other.
                </p>
              </div>

              <AddressListField
                initial={initialAddresses}
                fieldErrors={state.fieldErrors}
              />
            </fieldset>
          ) : null}

          <fieldset className="space-y-4">
            <legend className="sr-only">{group.title}</legend>

            <div className="border-b border-hairline pb-2">
              <h2 className="font-display text-sm font-semibold text-foreground">
                {group.title}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {group.description}
              </p>
            </div>

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
          </fieldset>
        </Fragment>
      ))}

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} busy={photoBusy} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
