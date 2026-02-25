export interface CountryDto {
  id: string;
  code: string;
  name: string;
}

export interface DepartmentDto {
  id: string;
  countryCode: string;
  countryName: string;
  code: string;
  name: string;
}

export interface CityDto {
  id: string;
  departmentCode: string;
  departmentName: string;
  code: string;
  name: string;
}

export interface LocationsRepository {
  listCountries(): Promise<CountryDto[]>;
  listDepartments(countryCode?: string): Promise<DepartmentDto[]>;
  listCities(departmentCode?: string): Promise<CityDto[]>;
}
