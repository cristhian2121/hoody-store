import { useLanguage } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { City } from "@/lib/shipping";

interface CitySearchInputProps {
  cityQuery: string;
  selectedCity: City | null;
  showCityOptions: boolean;
  filteredCities: City[];
  onCityInput: (value: string) => void;
  onCitySelect: (city: City) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export const CitySearchInput = ({
  cityQuery,
  selectedCity,
  showCityOptions,
  filteredCities,
  onCityInput,
  onCitySelect,
  onFocus,
  onBlur,
}: CitySearchInputProps) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-1">
      <Label htmlFor="citySearch" className="text-sm">
        {t("shipping.selectCity")}
      </Label>
      <div className="relative">
        <Input
          id="citySearch"
          value={cityQuery}
          onChange={(e) => onCityInput(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={t("shipping.selectCity")}
          className="text-sm"
          autoComplete="off"
        />
        {showCityOptions && (
          <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-2xl border bg-card shadow-lg">
            {filteredCities.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => onCitySelect(city)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
              >
                {city.name} · {city.department}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
