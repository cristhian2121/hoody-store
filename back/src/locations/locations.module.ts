import { Module } from "@nestjs/common";
import { LocationsController } from "./locations.controller";
import { LocationsService } from "../services/locations.service";
import { LocationsRepositoryPrisma } from "../repositories/prisma/locations.repository";

@Module({
  controllers: [LocationsController],
  providers: [
    LocationsService,
    {
      provide: "LocationsRepository",
      useClass: LocationsRepositoryPrisma,
    },
  ],
  exports: [LocationsService],
})
export class LocationsModule {}
