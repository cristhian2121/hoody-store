import { Injectable, Inject } from "@nestjs/common";
import {
  LocationsRepository,
  CountryDto,
  DepartmentDto,
  CityDto,
} from "../repositories/interfaces/locations.repository.interface";

@Injectable()
export class LocationsService {
  constructor(
    @Inject("LocationsRepository")
    private readonly locationsRepository: LocationsRepository,
  ) {}

  async getCountries(): Promise<CountryDto[]> {
    return this.locationsRepository.listCountries();
  }

  async getDepartments(countryCode?: string): Promise<DepartmentDto[]> {
    return this.locationsRepository.listDepartments(countryCode);
  }

  async getCities(departmentCode?: string): Promise<CityDto[]> {
    return this.locationsRepository.listCities(departmentCode);
  }
}
