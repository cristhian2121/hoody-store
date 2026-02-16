import { useState, useCallback, useMemo } from "react";
import type { City } from "@/lib/shipping";
import { COLOMBIA_CITIES } from "@/lib/shipping";
import { BLUR_DELAY_MS } from "@/lib/constants";

export const useCitySearch = (defaultCity?: City) => {
  const [cityQuery, setCityQuery] = useState(defaultCity?.name ?? "");
  const [selectedCityId, setSelectedCityId] = useState(defaultCity?.id ?? "");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const selectedCity = useMemo(
    () => COLOMBIA_CITIES.find((city) => city.id === selectedCityId) ?? null,
    [selectedCityId],
  );

  const filteredCities = useMemo(() => {
    const needle = cityQuery.toLowerCase();
    return COLOMBIA_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(needle) ||
        city.department.toLowerCase().includes(needle),
    ).slice(0, 6);
  }, [cityQuery]);

  const handleCityInput = useCallback((value: string) => {
    setCityQuery(value);
    setShowCitySuggestions(true);
    const matched = COLOMBIA_CITIES.find(
      (city) => city.name.toLowerCase() === value.toLowerCase(),
    );
    if (matched) {
      setSelectedCityId(matched.id);
    } else {
      setSelectedCityId("");
    }
  }, []);

  const handleCitySelect = useCallback((city: City) => {
    setCityQuery(city.name);
    setSelectedCityId(city.id);
    setShowCitySuggestions(false);
  }, []);

  const handleFocus = useCallback(() => {
    setShowCitySuggestions(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowCitySuggestions(false), BLUR_DELAY_MS);
  }, []);

  const showCityOptions =
    showCitySuggestions && cityQuery.trim().length > 0 && filteredCities.length > 0;

  return {
    cityQuery,
    setCityQuery,
    selectedCityId,
    setSelectedCityId,
    selectedCity,
    filteredCities,
    showCityOptions,
    handleCityInput,
    handleCitySelect,
    handleFocus,
    handleBlur,
  };
};
