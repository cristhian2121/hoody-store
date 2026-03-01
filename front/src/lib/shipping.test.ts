import { beforeEach, describe, expect, it, vi } from "vitest";
import { getShippingQuote } from "./shipping";

vi.mock("./api", () => ({
  ensureApiUrl: () => "http://api.test",
}));

describe("getShippingQuote", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch quote from backend with selected location", async () => {
    const quote = {
      country: { code: "CO", name: "Colombia" },
      department: { code: "11", name: "Bogotá D.C." },
      city: { code: "11001", name: "Bogotá" },
      amount: 20000,
      currency: "COP",
      provider: "fixed-default",
      calculatedAt: "2026-03-01T00:00:00.000Z",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ quote }),
      }),
    );

    const result = await getShippingQuote({
      countryCode: "CO",
      departmentCode: "11",
      cityCode: "11001",
    });

    expect(result).toEqual(quote);
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/api/shipping/quote?countryCode=CO&departmentCode=11&cityCode=11001",
    );
  });
});
