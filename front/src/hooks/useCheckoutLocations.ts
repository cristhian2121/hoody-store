import { useEffect, useMemo, useState } from "react";
import {
  COLOMBIA_COUNTRY_CODE,
  CityLocation,
  DepartmentLocation,
  fetchCitiesByDepartment,
  fetchDepartmentsByCountry,
} from "@/lib/locations";

export const useCheckoutLocations = () => {
  const [departments, setDepartments] = useState<DepartmentLocation[]>([]);
  const [cities, setCities] = useState<CityLocation[]>([]);
  const [selectedDepartmentCode, setSelectedDepartmentCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDepartments = async () => {
      setLoadingDepartments(true);
      setError(null);
      try {
        const list = await fetchDepartmentsByCountry(COLOMBIA_COUNTRY_CODE);
        setDepartments(list);
      } catch (err: any) {
        setError(err.message || "No pudimos cargar departamentos.");
      } finally {
        setLoadingDepartments(false);
      }
    };

    void loadDepartments();
  }, []);

  useEffect(() => {
    if (!selectedDepartmentCode) {
      setCities([]);
      setSelectedCityCode("");
      return;
    }

    const loadCities = async () => {
      setLoadingCities(true);
      setError(null);
      setSelectedCityCode("");
      try {
        const list = await fetchCitiesByDepartment(selectedDepartmentCode);
        setCities(list);
      } catch (err: any) {
        setError(err.message || "No pudimos cargar ciudades.");
      } finally {
        setLoadingCities(false);
      }
    };

    void loadCities();
  }, [selectedDepartmentCode]);

  const selectedDepartment = useMemo(
    () =>
      departments.find((department) => department.code === selectedDepartmentCode) || null,
    [departments, selectedDepartmentCode],
  );

  const selectedCity = useMemo(
    () => cities.find((city) => city.code === selectedCityCode) || null,
    [cities, selectedCityCode],
  );

  return {
    departments,
    cities,
    selectedDepartmentCode,
    setSelectedDepartmentCode,
    selectedCityCode,
    setSelectedCityCode,
    selectedDepartment,
    selectedCity,
    loadingDepartments,
    loadingCities,
    error,
  };
};
