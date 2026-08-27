import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { api } from "../mocks/handlers";
import RoastCard from "@/components/contacts/RoastCard";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const VCARD =
  "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ada Lovelace\r\nTITLE:Roast Grade: A+\r\nEND:VCARD\r\n";

function vcardHandler(status = 200) {
  return http.get(api("/api/v1/contacts/:id/vcard"), () =>
    status === 200
      ? new HttpResponse(VCARD, { headers: { "Content-Type": "text/vcard" } })
      : new HttpResponse(null, { status }),
  );
}

describe("RoastCard", () => {
  it("renders the QR code and the stamp", async () => {
    server.use(vcardHandler());

    const jsx = await RoastCard({ contact: { id: 1, full_name: "Ada Lovelace" } });
    render(jsx);

    expect(screen.getByText("Changes Requested")).toBeInTheDocument();
    expect(screen.getByText(/Code Review: Ada Lovelace/)).toBeInTheDocument();
    const qr = screen.getByAltText(/QR code.*Ada Lovelace/);
    expect(qr).toHaveAttribute("src", expect.stringMatching(/^data:image\/png;base64,/));
  });

  it("renders nothing when the contact has no roast vCard", async () => {
    server.use(vcardHandler(404));

    const jsx = await RoastCard({ contact: { id: 1, full_name: "Ada Lovelace" } });
    expect(jsx).toBeNull();
  });
});
