import QRCode from "qrcode";
import { getRoastVcard } from "@/lib/contacts/api";
import type { Contact } from "@/lib/contacts/types";

/**
 * A "code review" of the contact — deterministic trivia about their phone
 * number and address, QR-encoded as a vCard. Scanning it and tapping "Add
 * Contact" lands the roast in the judge's real Notes field.
 *
 * Server-rendered: the QR image is generated once per request, not
 * regenerated client-side, so there's no loading flicker and no JS needed to
 * see it.
 */
export default async function RoastCard({ contact }: { contact: Pick<Contact, "id" | "full_name"> }) {
  // The roast is a bonus, not the page: a backend 500/timeout on this optional
  // fetch must not take down a detail page whose main content already loaded.
  let vcard: string | null;
  try {
    vcard = await getRoastVcard(contact.id);
  } catch {
    return null;
  }
  if (!vcard) return null;

  let qrDataUrl: string;
  try {
    // Low error correction is deliberate: it's what gives the backend room
    // to fit the roast text under the QR format's byte ceiling.
    qrDataUrl = await QRCode.toDataURL(vcard, { errorCorrectionLevel: "L", margin: 1 });
  } catch {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-4 -rotate-12 select-none rounded border-2 border-destructive/70 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-destructive/70"
      >
        Changes Requested
      </div>

      <p className="font-display text-sm font-semibold text-foreground">
        Code Review: {contact.full_name}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        A roast of this contact&rsquo;s phone number and address, delivered
        straight into Notes when the QR code below is scanned and added.
      </p>

      <div className="mt-4 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL; next/image adds nothing here */}
        <img
          src={qrDataUrl}
          alt={`QR code — scan to add ${contact.full_name} to your contacts`}
          className="h-32 w-32 shrink-0 rounded-md border border-hairline bg-white p-1"
        />
        <p className="text-[13px] text-muted-foreground">
          Scan → Add Contact → open Notes.
          <br />
          Same number, same roast, every time — it&rsquo;s deterministic, not broken.
          <br />
          <a
            href={`/contacts/${contact.id}/vcard?roast=1`}
            className="text-primary hover:underline"
          >
            Notes not showing up? Download the .vcf instead
          </a>
          <span className="text-muted-foreground/70">
            {" "}
            — some phones&rsquo; camera-scan preview skips Notes; opening the file
            imports every field.
          </span>
        </p>
      </div>
    </div>
  );
}
