export interface City {
  id: string;
  name: string;
  department: string;
  shippingCost: number; // en COP
}

export const COLOMBIA_CITIES: City[] = [
  { id: "bog", name: "Bogotá", department: "Cundinamarca", shippingCost: 0 },
  { id: "med", name: "Medellín", department: "Antioquia", shippingCost: 4000 },
  { id: "cal", name: "Cali", department: "Valle del Cauca", shippingCost: 5000 },
  { id: "bqa", name: "Barranquilla", department: "Atlántico", shippingCost: 5500 },
  { id: "ctg", name: "Cartagena", department: "Bolívar", shippingCost: 6000 },
  { id: "buc", name: "Bucaramanga", department: "Santander", shippingCost: 5200 },
  { id: "pei", name: "Pereira", department: "Risaralda", shippingCost: 4800 },
  { id: "man", name: "Manizales", department: "Caldas", shippingCost: 4700 },
];

export const SHIPPING_DAYS = 8;
