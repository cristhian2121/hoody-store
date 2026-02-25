import { PrismaClient } from "@prisma/client";
import departmentsJson from "./departments.json";
import citiesJson from "./cities.json";
import { Department, City } from "@prisma/client";

const prisma = new PrismaClient();
const departments = departmentsJson.map((dept) => ({
  ...dept,
  countryName: dept.countryName,
})) as Department[];
const cities = citiesJson.map((city) => ({
  ...city,
  departmentName: city.department_name,
})) as City[];

const countries = [{ code: "CO", name: "Colombia" }];

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
          departmentCode: city.deparment_name,
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
