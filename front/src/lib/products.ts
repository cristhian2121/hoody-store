import type { Product } from "./types";
// import hoodieBlack from "@/assets/hoodie-black.jpg";
import hoodieBlack from "@/assets/hoodie_sh1.png";
import hoodieGray from "@/assets/hoodie-gray.jpg";
import hoodieBase from "@/assets/hoodie_base.png";
import tshirtWhite from "@/assets/tshirt-white.jpg";
import tshirtBlack from "@/assets/tshirt-black.jpg";

export const products: Product[] = [
  {
    id: "hoodie-clasico",
    slug: "hoodie-clasico",
    category: "hoodies",
    name: { es: "Hoodie Clásico", en: "Classic Hoodie" },
    description: {
      es: "Hoodie de algodón premium con acabado suave. Perfecto para personalizar con tu diseño favorito. Capucha ajustable, bolsillo canguro y costuras reforzadas.",
      en: "Premium cotton hoodie with soft finish. Perfect for customizing with your favorite design. Adjustable hood, kangaroo pocket, and reinforced stitching.",
    },
    price: 89900,
    images: [hoodieBlack, hoodieGray],
    garmentBase: hoodieBase,
    colors: [
      { id: "negro", name: { es: "Negro", en: "Black" }, hex: "#1a1a1a" },
      { id: "gris", name: { es: "Gris", en: "Gray" }, hex: "#9ca3af" },
      { id: "blanco", name: { es: "Blanco", en: "White" }, hex: "#f5f5f5" },
    ],
    sizes: {
      hombre: ["S", "M", "L", "XL", "XXL"],
      mujer: ["XS", "S", "M", "L", "XL"],
    },
  },
  {
    id: "hoodie-premium",
    slug: "hoodie-premium",
    category: "hoodies",
    name: { es: "Hoodie Premium", en: "Premium Hoodie" },
    description: {
      es: "Hoodie de alta gama con tejido orgánico de 380g. Interior afelpado, cremallera YKK y detalles de diseño exclusivo. Ideal para sublimación de alta definición.",
      en: "High-end hoodie with 380g organic fabric. Fleece interior, YKK zipper, and exclusive design details. Ideal for high-definition sublimation.",
    },
    price: 119900,
    images: [hoodieGray, hoodieBlack],
    garmentBase: hoodieBase,
    colors: [
      { id: "gris", name: { es: "Gris", en: "Gray" }, hex: "#9ca3af" },
      { id: "negro", name: { es: "Negro", en: "Black" }, hex: "#1a1a1a" },
      {
        id: "verde",
        name: { es: "Verde oscuro", en: "Dark Green" },
        hex: "#166534",
      },
    ],
    sizes: {
      hombre: ["S", "M", "L", "XL", "XXL"],
      mujer: ["XS", "S", "M", "L", "XL"],
    },
  },
  {
    id: "camiseta-esencial",
    slug: "camiseta-esencial",
    category: "camisetas",
    name: { es: "Camiseta Esencial", en: "Essential T-Shirt" },
    description: {
      es: "Camiseta de algodón 100% peinado con corte regular. Tela suave de 180g, cuello redondo reforzado. Superficie óptima para estampado por sublimación.",
      en: "100% combed cotton t-shirt with regular fit. Soft 180g fabric, reinforced crew neck. Optimal surface for sublimation printing.",
    },
    price: 49900,
    images: [tshirtWhite, tshirtBlack],
    colors: [
      { id: "blanco", name: { es: "Blanco", en: "White" }, hex: "#f5f5f5" },
      { id: "negro", name: { es: "Negro", en: "Black" }, hex: "#1a1a1a" },
      { id: "gris", name: { es: "Gris", en: "Gray" }, hex: "#9ca3af" },
    ],
    sizes: {
      hombre: ["S", "M", "L", "XL", "XXL"],
      mujer: ["XS", "S", "M", "L", "XL"],
    },
  },
  {
    id: "camiseta-urban",
    slug: "camiseta-urban",
    category: "camisetas",
    name: { es: "Camiseta Urban", en: "Urban T-Shirt" },
    description: {
      es: "Camiseta de corte oversized con tejido premium de 220g. Hombros caídos, costuras flatlock y acabado enzyme wash. Perfecta para diseños grandes.",
      en: "Oversized t-shirt with 220g premium fabric. Drop shoulders, flatlock stitching, and enzyme wash finish. Perfect for large designs.",
    },
    price: 64900,
    images: [tshirtBlack, tshirtWhite],
    colors: [
      { id: "negro", name: { es: "Negro", en: "Black" }, hex: "#1a1a1a" },
      { id: "blanco", name: { es: "Blanco", en: "White" }, hex: "#f5f5f5" },
      { id: "oliva", name: { es: "Oliva", en: "Olive" }, hex: "#6b7c3e" },
    ],
    sizes: {
      hombre: ["S", "M", "L", "XL", "XXL"],
      mujer: ["XS", "S", "M", "L", "XL"],
    },
  },
];

export const getProduct = (slug: string) =>
  products.find((p) => p.slug === slug);
export const getByCategory = (category: string) =>
  products.filter((p) => p.category === category);
