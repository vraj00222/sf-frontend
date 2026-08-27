import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressListField from "@/components/contacts/AddressListField";
import type { AddressFormValues } from "@/lib/contacts/types";

const entry = (over: Partial<AddressFormValues> = {}): AddressFormValues => ({
  type: "Home",
  street: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  ...over,
});

describe("AddressListField", () => {
  it("keeps typed values under its own control", async () => {
    render(<AddressListField initial={[entry()]} />);

    const city = screen.getByLabelText("City");
    await userEvent.type(city, "Oakland");

    expect(city).toHaveValue("Oakland");
    expect(city).toHaveAttribute("name", "addresses.0.city");
  });

  it("keeps an error attached to its entry when an earlier one is removed", async () => {
    // Errors arrive keyed by submit-time index; removing the first entry must
    // not shift the message onto a different address.
    function Harness() {
      const [errors, setErrors] = useState<Record<string, string>>();
      return (
        <>
          <button onClick={() => setErrors({ "addresses.1.street": "Fill in at least one address field" })}>
            fail submit
          </button>
          <AddressListField
            initial={[entry({ city: "SF" }), entry(), entry({ city: "Tahoe" })]}
            fieldErrors={errors}
          />
        </>
      );
    }
    render(<Harness />);

    await userEvent.click(screen.getByText("fail submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("Fill in at least one address field");

    await userEvent.click(screen.getByRole("button", { name: "Remove address 1" }));

    // The blank entry (now first) still owns the error; the valid one does not.
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    const cities = screen.getAllByLabelText("City");
    expect(cities[0]).toHaveValue("");
    expect(cities[1]).toHaveValue("Tahoe");
    expect(cities[1]).not.toHaveAttribute("aria-invalid");
  });

  it("clears an entry's errors once the user edits any of its fields", async () => {
    // The message is cross-field ("at least one address field"), so filling in
    // any field in that entry can make it obsolete — it must not linger.
    function Harness() {
      const [errors, setErrors] = useState<Record<string, string>>();
      return (
        <>
          <button onClick={() => setErrors({ "addresses.0.street": "Fill in at least one address field" })}>
            fail submit
          </button>
          <AddressListField initial={[entry()]} fieldErrors={errors} />
        </>
      );
    }
    render(<Harness />);

    await userEvent.click(screen.getByText("fail submit"));
    const city = screen.getByLabelText("City");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Street address")).toHaveAttribute("aria-invalid", "true");

    await userEvent.type(city, "Oakland");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Street address")).not.toHaveAttribute("aria-invalid");
  });
});
