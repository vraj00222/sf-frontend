"use client";

import { useState, type CSSProperties } from "react";
import { avatarHue, initials } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/**
 * Contact photo as a circular avatar; falls back to the initials bubble,
 * tinted with a hue derived from the contact's email, when there is no photo.
 */
export default function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<Contact, "id" | "first_name" | "last_name" | "email"> & {
    /** The inline data URL, when the caller already has it (detail, preview). */
    photo?: string | null;
    /** Set by the list, which fetches the image from the photo route instead. */
    has_photo?: boolean;
  };
  size?: keyof typeof SIZES;
}) {
  const [broken, setBroken] = useState(false);
  const src = contact.photo ?? (contact.has_photo ? `/contacts/${contact.id}/photo` : null);

  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL or our own route; next/image adds nothing here
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        // A stored photo the browser cannot decode would otherwise show a broken
        // image forever; fall through to the initials bubble instead.
        onError={() => setBroken(true)}
        className={`inline-block shrink-0 select-none rounded-full aspect-square object-cover ${SIZES[size]}`}
      />
    );
  }

  const style = {
    "--avatar-hue": avatarHue(contact.email),
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`contact-avatar inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-semibold ${SIZES[size]}`}
    >
      {initials(contact)}
    </span>
  );
}
