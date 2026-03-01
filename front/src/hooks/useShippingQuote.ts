import { useEffect, useState } from "react";
import { getShippingQuote, ShippingQuote } from "@/lib/shipping";

interface UseShippingQuoteParams {
  countryCode: string;
  departmentCode: string;
  cityCode: string;
}

export const useShippingQuote = ({
  countryCode,
  departmentCode,
  cityCode,
}: UseShippingQuoteParams) => {
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryCode || !departmentCode || !cityCode) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;

    const loadQuote = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getShippingQuote({
          countryCode,
          departmentCode,
          cityCode,
        });
        if (active) {
          setQuote(result);
        }
      } catch (err: any) {
        if (active) {
          setQuote(null);
          setError(err.message || "No pudimos calcular el envío.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadQuote();

    return () => {
      active = false;
    };
  }, [countryCode, departmentCode, cityCode]);

  return {
    quote,
    shippingCost: quote?.amount ?? 0,
    loading,
    error,
  };
};
