import { ensureApiUrl } from "./api";

export const SHIPPING_DAYS = 8;

export interface ShippingQuote {
  country: {
    code: string;
    name: string;
  };
  department: {
    code: string;
    name: string;
  };
  city: {
    code: string;
    name: string;
  };
  amount: number;
  currency: string;
  provider: string;
  calculatedAt: string;
}

export const getShippingQuote = async ({
  countryCode,
  departmentCode,
  cityCode,
}: {
  countryCode: string;
  departmentCode: string;
  cityCode: string;
}): Promise<ShippingQuote> => {
  const apiUrl = ensureApiUrl();

  const response = await fetch(
    `${apiUrl}/api/shipping/quote?countryCode=${encodeURIComponent(
      countryCode,
    )}&departmentCode=${encodeURIComponent(
      departmentCode,
    )}&cityCode=${encodeURIComponent(cityCode)}`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "No pudimos calcular el costo de envío.");
  }

  const data = await response.json();
  return data.quote;
};
