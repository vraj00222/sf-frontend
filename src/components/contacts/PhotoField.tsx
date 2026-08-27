"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, User } from "lucide-react";
import Button from "@/components/ui/Button";
import { MAX_PHOTO_BYTES } from "@/lib/contacts/schema";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Avatars render at 80px and below, so anything past this is wasted bytes. */
const MAX_DIMENSION = 512;

/**
 * Downscale the image to a 512px-max avatar before it becomes base64, so the
 * form posts kilobytes instead of megabytes. PNG stays PNG (transparency);
 * everything else becomes JPEG.
 */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return file.type === "image/png"
    ? canvas.toDataURL("image/png")
    : canvas.toDataURL("image/jpeg", 0.85);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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
  // Guards against a slow read landing after a newer selection or a remove.
  const readSequence = useRef(0);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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

    const sequence = ++readSequence.current;
    try {
      // GIFs pass through untouched (downscaling drops the animation).
      const dataUrl =
        file.type === "image/gif"
          ? await readAsDataUrl(file)
          : await toAvatarDataUrl(file).catch(() => readAsDataUrl(file));
      if (sequence !== readSequence.current) return; // superseded
      setPhoto(dataUrl);
      setFileError(null);
    } catch {
      if (sequence !== readSequence.current) return;
      setFileError("That file could not be read. Try another image.");
    }
  }

  const message = fileError ?? error;
  const errorId = "field-photo-error";

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
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : undefined}
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
                readSequence.current += 1; // invalidate any in-flight read
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
          <p id={errorId} role="alert" className="mt-1.5 text-[13px] text-destructive">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
