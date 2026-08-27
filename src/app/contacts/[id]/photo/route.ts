import { getContact } from "@/lib/contacts/api";
import { parseContactId } from "@/lib/contacts/query";

/**
 * Serve a contact's photo as a real image response.
 *
 * The API stores photos as base64 data URLs. Embedding those in the list page
 * would put megabytes of base64 in the payload the browser downloads, so list
 * avatars point here instead: the bytes travel once, only for avatars actually
 * on screen, and the browser can cache them.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = parseContactId((await params).id);
  if (id === null) return new Response("Not found", { status: 404 });

  const contact = await getContact(id);
  if (!contact?.photo) return new Response("No photo", { status: 404 });

  const [header, payload] = contact.photo.split(",", 2);
  const type = header?.match(/^data:(image\/[a-z+]+);base64$/)?.[1];
  if (!type || !payload) return new Response("No photo", { status: 404 });

  return new Response(Buffer.from(payload, "base64"), {
    headers: {
      "Content-Type": type,
      // Private: a photo is one person's data, and the URL is stable across
      // edits, so revalidate rather than letting a stale face stick around.
      "Cache-Control": "private, no-cache",
      ETag: `"${contact.updated_at}"`,
    },
  });
}
