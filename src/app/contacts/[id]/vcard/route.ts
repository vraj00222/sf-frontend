import { ApiUnreachableError, apiFetch } from "@/lib/apiClient";
import { parseContactId } from "@/lib/contacts/query";

/**
 * Proxy the API's vCard export so the browser can download it without ever
 * talking to the backend directly (its URL stays server-side, like all other
 * data access in this app).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseContactId((await params).id);
  if (id === null) {
    return new Response("Contact not found", { status: 404 });
  }

  const roast = new URL(request.url).searchParams.get("roast");
  const query = roast ? "?roast=1" : "";

  let upstream: Response;
  try {
    upstream = await apiFetch(`/api/v1/contacts/${id}/vcard${query}`);
  } catch (error) {
    if (!(error instanceof ApiUnreachableError)) throw error;
    return new Response("The contacts API is unavailable", { status: 502 });
  }

  if (!upstream.ok) {
    const reason = upstream.status === 404 ? "Contact not found" : "Export failed";
    return new Response(reason, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/vcard",
      "Content-Disposition":
        upstream.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
