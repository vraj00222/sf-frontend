import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { api } from "../mocks/handlers";
import { GET } from "@/app/contacts/[id]/vcard/route";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const VCARD = "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ada Lovelace\r\nEND:VCARD\r\n";

function vcardHandler(body: string) {
  return http.get(api("/api/v1/contacts/:id/vcard"), () =>
    new HttpResponse(body, {
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": 'attachment; filename="Ada Lovelace.vcf"',
      },
    }),
  );
}

/** The route's `params` are a promise in the App Router. */
function get(id: string) {
  return GET(new Request("http://localhost/x"), { params: Promise.resolve({ id }) });
}

describe("GET /contacts/[id]/vcard", () => {
  it("streams the vCard through with the upstream headers", async () => {
    server.use(vcardHandler(VCARD));

    const response = await get("1");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/vcard; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="Ada Lovelace.vcf"',
    );
    await expect(response.text()).resolves.toBe(VCARD);
  });

  it.each(["abc", "0", "-1", "1e3", "../admin"])(
    "rejects %p without calling the API",
    async (id) => {
      // No handler registered: reaching the API would fail the unhandled-request guard.
      expect((await get(id)).status).toBe(404);
    },
  );

  it("passes an upstream failure's status through", async () => {
    server.use(
      http.get(api("/api/v1/contacts/:id/vcard"), () =>
        HttpResponse.json({ detail: "boom" }, { status: 503 }),
      ),
    );

    const response = await get("1");

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.not.toMatch(/not found/i);
  });

  it("answers 502 when the API cannot be reached", async () => {
    server.use(http.get(api("/api/v1/contacts/:id/vcard"), () => HttpResponse.error()));

    expect((await get("1")).status).toBe(502);
  });

  it("forwards ?roast=1 to the backend when present", async () => {
    let requestedUrl = "";
    server.use(
      http.get(api("/api/v1/contacts/:id/vcard"), ({ request }) => {
        requestedUrl = request.url;
        return new HttpResponse(VCARD, { headers: { "Content-Type": "text/vcard" } });
      }),
    );

    await GET(new Request("http://localhost/x?roast=1"), { params: Promise.resolve({ id: "1" }) });

    expect(requestedUrl).toContain("roast=1");
  });

  it("does not add a roast param when absent", async () => {
    let requestedUrl = "";
    server.use(
      http.get(api("/api/v1/contacts/:id/vcard"), ({ request }) => {
        requestedUrl = request.url;
        return new HttpResponse(VCARD, { headers: { "Content-Type": "text/vcard" } });
      }),
    );

    await get("1");

    expect(requestedUrl).not.toContain("roast");
  });
});
