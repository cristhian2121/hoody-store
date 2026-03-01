import { ensureApiUrl } from "./api";

export const COLOMBIA_COUNTRY_CODE = "CO";
export const COLOMBIA_COUNTRY_NAME = "Colombia";

export interface DepartmentLocation {
  id: string;
  countryCode: string;
  countryName: string;
  code: string;
  name: string;
}

export interface CityLocation {
  id: string;
  departmentCode: string;
  departmentName: string;
  code: string;
  name: string;
}

export const fetchDepartmentsByCountry = async (
  countryCode: string,
): Promise<DepartmentLocation[]> => {
  const apiUrl = ensureApiUrl();
  const response = await fetch(
    `${apiUrl}/api/locations/departments?countryCode=${encodeURIComponent(countryCode)}`,
  );

  if (!response.ok) {
    throw new Error("No pudimos cargar los departamentos.");
  }

  const data = await response.json();
  return data.departments || [];
};

export const fetchCitiesByDepartment = async (
  departmentCode: string,
): Promise<CityLocation[]> => {
  const apiUrl = ensureApiUrl();
  const response = await fetch(
    `${apiUrl}/api/locations/cities?departmentCode=${encodeURIComponent(departmentCode)}`,
  );

  if (!response.ok) {
    throw new Error("No pudimos cargar las ciudades.");
  }

  const data = await response.json();
  return data.cities || [];
};
