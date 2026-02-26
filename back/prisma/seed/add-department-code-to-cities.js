const fs = require("node:fs");
const path = require("node:path");

const baseDir = __dirname;
const departmentsPath = path.join(baseDir, "departments.json");
const citiesPath = path.join(baseDir, "cities.json");

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function main() {
  const departments = JSON.parse(fs.readFileSync(departmentsPath, "utf8"));
  const cities = JSON.parse(fs.readFileSync(citiesPath, "utf8"));

  const departmentCodeByName = new Map();
  for (const department of departments) {
    const normalizedName = normalizeName(department.name);
    if (!normalizedName) continue;
    departmentCodeByName.set(normalizedName, department.code);
  }

  let matched = 0;
  const unmatched = new Set();

  const citiesWithDepartmentCode = cities.map((city) => {
    const normalizedDepartmentName = normalizeName(city.department_name);
    const departmentCode = departmentCodeByName.get(normalizedDepartmentName);

    if (departmentCode) {
      matched += 1;
      return {
        ...city,
        department_code: departmentCode,
      };
    }

    unmatched.add(city.department_name);
    return city;
  });

  fs.writeFileSync(citiesPath, JSON.stringify(citiesWithDepartmentCode, null, 2) + "\n", "utf8");

  console.log(`Updated cities.json with department_code.`);
  console.log(`Matched: ${matched}/${cities.length}`);
  if (unmatched.size > 0) {
    console.log(`Unmatched department names (${unmatched.size}):`);
    for (const name of unmatched) {
      console.log(`- ${name}`);
    }
  }
}

main();
