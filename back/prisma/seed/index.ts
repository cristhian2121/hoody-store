import { PrismaClient } from "@prisma/client";
import departmentsJson = require("./departments.json");
import citiesJson = require("./cities.json");
import countriesJson = require("./countries.json");
import { Department, City, Country } from "@prisma/client";

const prisma = new PrismaClient();
const departments = departmentsJson.map((dept) => ({
  ...dept,
  countryName: dept.countryName,
})) as Department[];
const cities = citiesJson.map((city) => ({
  ...city,
  departmentName: city.departmentName,
  departmentCode: city.departmentCode,
})) as City[];

const countries = countriesJson.map((country) => ({
  ...country,
})) as Country[];

async function main() {
  console.log("Seeding countries...");
  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: country,
    });
  }
  console.log(`Seeded ${countries.length} countries`);

  console.log("Seeding departments...");
  for (const dept of departments) {
    await prisma.department.upsert({
      where: {
        countryCode_code: {
          countryCode: dept.countryCode,
          code: dept.code,
        },
      },
      update: {
        countryName: dept.countryName,
        name: dept.name,
      },
      create: dept,
    });
  }
  console.log(`Seeded ${departments.length} departments`);

  console.log("Seeding cities...");
  for (const city of cities) {
    await prisma.city.upsert({
      where: {
        departmentCode_code: {
          departmentCode: city.departmentCode,
          code: city.code,
        },
      },
      update: {},
      create: city,
    });
  }
  console.log(`Seeded ${cities.length} cities`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
