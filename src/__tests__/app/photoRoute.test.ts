import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { api, makeContact } from "../mocks/handlers";
import { GET } from "@/app/contacts/[id]/photo/route";
import { listContacts } from "@/lib/contacts/api";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// 1x1 transparent PNG.
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function get(id: string) {
  return GET(new Request("http://localhost/x"), { params: Promise.resolve({ id }) });
}

function contactHandler(photo: string | null) {
  return http.get(api("/api/v1/contacts/:id"), () =>
    HttpResponse.json(makeContact({ photo })),
  );
}

describe("GET /contacts/[id]/photo", () => {
  it("returns the decoded image bytes, not the data URL", async () => {
    server.use(contactHandler(PHOTO));

    const response = await get("1");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    const bytes = new Uint8Array(await response.arrayBuffer());
    // PNG magic number: the body is a real image, not base64 text.
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("404s when the contact has no photo", async () => {
    server.use(contactHandler(null));
    expect((await get("1")).status).toBe(404);
  });

  it.each(["abc", "0", "1e3"])("rejects %p without calling the API", async (id) => {
    expect((await get(id)).status).toBe(404);
  });
});

describe("listContacts", () => {
  it("strips the photo and reports it as a flag", async () => {
    server.use(
      http.get(api("/api/v1/contacts"), () =>
        HttpResponse.json({
          items: [makeContact({ photo: PHOTO }), makeContact({ id: 2, photo: null })],
          total: 2,
          limit: 25,
          offset: 0,
        }),
      ),
    );

    const page = await listContacts();

    expect(page.items[0]).not.toHaveProperty("photo");
    expect(page.items[0].has_photo).toBe(true);
    expect(page.items[1].has_photo).toBe(false);
  });
});
