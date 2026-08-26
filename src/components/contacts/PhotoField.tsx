"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, User } from "lucide-react";
import Button from "@/components/ui/Button";
import { MAX_PHOTO_BYTES } from "@/lib/contacts/schema";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/**
 * Photo picker for the contact form. Reads the chosen file into a base64 data
 * URL (the backend stores images inline) and submits it through a hidden input,
 * so the form still posts as plain form data. Always rendered — including on
 * edit — so an existing photo survives the PUT full-replace.
 */
export default function PhotoField({
  initialPhoto,
  error,
}: {
  initialPhoto: string | null;
  error?: string;
}) {
  const [photo, setPhoto] = useState(initialPhoto);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allow re-selecting the same file after a remove.
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("Choose a PNG, JPEG, GIF, or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFileError("Photo must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      setFileError(null);
    };
    reader.onerror = () => setFileError("That file could not be read. Try another image.");
    reader.readAsDataURL(file);
  }

  const message = fileError ?? error;

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="photo" value={photo ?? ""} />
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={onFileChange}
        className="sr-only"
        aria-label="Choose profile photo"
      />

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- base64 data URL; next/image adds nothing here
        <img
          src={photo}
          alt="Profile photo preview"
          className="h-20 w-20 shrink-0 rounded-full aspect-square object-cover border border-border"
        />
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-20 w-20 shrink-0 select-none items-center justify-center rounded-full border border-dashed border-border bg-secondary/40 text-muted-foreground"
        >
          <User className="h-8 w-8" strokeWidth={1.5} />
        </span>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            {photo ? "Change photo" : "Add photo"}
          </Button>
          {photo ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPhoto(null);
                setFileError(null);
              }}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-[12px] text-muted-foreground">
          PNG, JPEG, GIF, or WebP up to 2 MB. Shown as a circular avatar.
        </p>
        {message ? (
          <p role="alert" className="text-[13px] text-destructive">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
