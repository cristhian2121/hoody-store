import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmCheckoutPayment } from "./mercadopago";

vi.mock("./api", () => ({
  ensureApiUrl: () => "http://api.test",
}));

describe("confirmCheckoutPayment", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should confirm payment on backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, orderId: "ord-1", status: "paid" }),
      }),
    );

    const result = await confirmCheckoutPayment("12345");

    expect(result).toEqual({ ok: true, orderId: "ord-1", status: "paid" });
    expect(fetch).toHaveBeenCalledWith("http://api.test/api/payments/mercadopago/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: "12345" }),
    });
  });
});
