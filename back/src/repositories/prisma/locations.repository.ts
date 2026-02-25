import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  LocationsRepository,
  CountryDto,
  DepartmentDto,
  CityDto,
} from "../interfaces/locations.repository.interface";
import { Country, Department, City } from "@prisma/client";

@Injectable()
export class LocationsRepositoryPrisma implements LocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCountries(): Promise<CountryDto[]> {
    const countries = await this.prisma.country.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return countries.map((country) => this.mapCountryToDto(country));
  }

  async listDepartments(countryCode?: string): Promise<DepartmentDto[]> {
    const where = countryCode ? { countryCode } : {};
    const departments = await this.prisma.department.findMany({
      where,
      orderBy: {
        name: "asc",
      },
    });
    return departments.map((dept) => this.mapDepartmentToDto(dept));
  }

  async listCities(departmentCode?: string): Promise<CityDto[]> {
    const where = departmentCode ? { departmentCode } : {};
    const cities = await this.prisma.city.findMany({
      where,
      orderBy: {
        name: "asc",
      },
    });
    return cities.map((city) => this.mapCityToDto(city));
  }

  private mapCountryToDto(country: Country): CountryDto {
    return {
      id: country.id,
      code: country.code,
      name: country.name,
    };
  }

  private mapDepartmentToDto(department: Department): DepartmentDto {
    return {
      id: department.id,
      countryCode: department.countryCode,
      countryName: department.countryName,
      code: department.code,
      name: department.name,
    };
  }

  private mapCityToDto(city: City): CityDto {
    return {
      id: city.id,
      departmentCode: city.departmentCode,
      departmentName: city.departmentName,
      code: city.code,
      name: city.name,
    };
  }
}
