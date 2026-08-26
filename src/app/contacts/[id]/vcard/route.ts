import { apiFetch } from "@/lib/apiClient";

/**
 * Proxy the API's vCard export so the browser can download it without ever
 * talking to the backend directly (its URL stays server-side, like all other
 * data access in this app).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await apiFetch(`/api/v1/contacts/${id}/vcard`);
  if (!upstream.ok) {
    return new Response("Not found", { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/vcard",
      "Content-Disposition":
        upstream.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
