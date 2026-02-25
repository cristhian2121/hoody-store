import { Controller, Get, Query, HttpCode, HttpStatus } from "@nestjs/common";
import { LocationsService } from "../services/locations.service";

@Controller("api/locations")
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get("countries")
  @HttpCode(HttpStatus.OK)
  async getCountries() {
    const countries = await this.locationsService.getCountries();
    return { countries };
  }

  @Get("departments")
  @HttpCode(HttpStatus.OK)
  async getDepartments(@Query("countryCode") countryCode?: string) {
    const departments = await this.locationsService.getDepartments(countryCode);
    return { departments };
  }

  @Get("cities")
  @HttpCode(HttpStatus.OK)
  async getCities(@Query("departmentCode") departmentCode?: string) {
    const cities = await this.locationsService.getCities(departmentCode);
    return { cities };
  }
}
