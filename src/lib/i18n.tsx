import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import type { Language } from "./types";

const translations = {
  es: {
    // Nav
    "nav.home": "Inicio",
    "nav.hoodies": "Hoodies",
    "nav.tshirts": "Camisetas",
    "nav.cart": "Carrito",
    "nav.menu": "Menú",
    // Hero
    "hero.title": "Diseña tu estilo",
    "hero.subtitle":
      "Personaliza hoodies y camisetas con tu propio diseño o genera uno con IA.",
    "hero.cta": "Explorar productos",
    "hero.secondary": "Cómo funciona",
    // Products
    "products.featured": "Productos destacados",
    "products.all": "Todos los productos",
    "products.viewAll": "Ver todos",
    // Product detail
    "product.gender": "Género",
    "product.gender.hombre": "Hombre",
    "product.gender.mujer": "Mujer",
    "product.size": "Talla",
    "product.color": "Color",
    "product.addToCart": "Agregar al carrito",
    "product.personalize": "Personalizar",
    "product.sizeGuide": "Guía de tallas",
    "product.description": "Descripción",
    "product.price": "Precio",
    // Personalization
    "editor.title": "Editor de diseño",
    "editor.uploadImage": "Subir imagen",
    "editor.addText": "Agregar texto",
    "editor.front": "Frente",
    "editor.back": "Espalda",
    "editor.scale": "Escala",
    "editor.rotation": "Rotación",
    "editor.font": "Fuente",
    "editor.fontSize": "Tamaño",
    "editor.textColor": "Color del texto",
    "editor.bold": "Negrita",
    "editor.italic": "Cursiva",
    "editor.center": "Centrar",
    "editor.reset": "Restablecer",
    "editor.save": "Guardar diseño",
    "editor.preview": "Vista previa",
    "editor.printArea": "Área de impresión",
    "editor.dragHint": "Arrastra para posicionar",
    "editor.generateAI": "Generar con IA",
    "editor.aiPrompt": "Describe tu diseño...",
    "editor.generating": "Generando...",
    "editor.removeImage": "Quitar imagen",
    "editor.removeText": "Quitar texto",
    // Cart
    "cart.title": "Tu carrito",
    "cart.empty": "Tu carrito está vacío",
    "cart.subtotal": "Subtotal",
    "cart.shipping": "Envío",
    "cart.shippingCalc": "Calculado en checkout",
    "cart.total": "Total",
    "cart.checkout": "Ir a pagar",
    "cart.continue": "Seguir comprando",
    "cart.remove": "Eliminar",
    "cart.personalized": "Personalizado",
    "cart.items": "artículos",
    // Checkout
    "checkout.title": "Checkout",
    "checkout.guest": "Comprar como invitado",
    "checkout.login": "Iniciar sesión",
    "checkout.contact": "Información de contacto",
    "checkout.shipping": "Dirección de envío",
    "checkout.payment": "Método de pago",
    "checkout.review": "Resumen del pedido",
    "checkout.firstName": "Nombre",
    "checkout.lastName": "Apellido",
    "checkout.email": "Correo electrónico",
    "checkout.phone": "Teléfono",
    "checkout.address": "Dirección",
    "checkout.city": "Ciudad",
    "checkout.state": "Departamento / Provincia",
    "checkout.zip": "Código postal",
    "checkout.country": "País",
    "checkout.card": "Tarjeta de crédito/débito",
    "checkout.pse": "PSE (Colombia)",
    "checkout.bankTransfer": "Transferencia bancaria",
    "checkout.placeOrder": "Realizar pedido",
    "checkout.processing": "Procesando...",
    // Category
    "category.hoodies": "Hoodies",
    "category.camisetas": "Camisetas",
    "category.filter": "Filtrar",
    "category.sort": "Ordenar",
    "category.results": "resultados",
    // Footer
    "footer.rights": "Todos los derechos reservados.",
    "footer.about": "Sobre nosotros",
    "footer.help": "Ayuda",
    "footer.terms": "Términos",
    "footer.privacy": "Privacidad",
    // Size guide
    "sizeGuide.title": "Guía de tallas",
    "sizeGuide.chest": "Pecho",
    "sizeGuide.length": "Largo",
    "sizeGuide.shoulder": "Hombro",
    "sizeGuide.cm": "cm",
    // General
    "general.currency": "COP",
    "general.language": "Idioma",
    "general.theme": "Tema",
    "general.light": "Claro",
    "general.dark": "Oscuro",
  },
  en: {
    "nav.home": "Home",
    "nav.hoodies": "Hoodies",
    "nav.tshirts": "T-Shirts",
    "nav.cart": "Cart",
    "nav.menu": "Menu",
    "hero.title": "Design your style",
    "hero.subtitle":
      "Customize hoodies and t-shirts with your own design or generate one with AI.",
    "hero.cta": "Explore products",
    "hero.secondary": "How it works",
    "products.featured": "Featured products",
    "products.all": "All products",
    "products.viewAll": "View all",
    "product.gender": "Gender",
    "product.gender.hombre": "Men",
    "product.gender.mujer": "Women",
    "product.size": "Size",
    "product.color": "Color",
    "product.addToCart": "Add to cart",
    "product.personalize": "Personalize",
    "product.sizeGuide": "Size guide",
    "product.description": "Description",
    "product.price": "Price",
    "editor.title": "Design editor",
    "editor.uploadImage": "Upload image",
    "editor.addText": "Add text",
    "editor.front": "Front",
    "editor.back": "Back",
    "editor.scale": "Scale",
    "editor.rotation": "Rotation",
    "editor.font": "Font",
    "editor.fontSize": "Size",
    "editor.textColor": "Text color",
    "editor.bold": "Bold",
    "editor.italic": "Italic",
    "editor.center": "Center",
    "editor.reset": "Reset",
    "editor.save": "Save design",
    "editor.preview": "Preview",
    "editor.printArea": "Print area",
    "editor.dragHint": "Drag to position",
    "editor.generateAI": "Generate with AI",
    "editor.aiPrompt": "Describe your design...",
    "editor.generating": "Generating...",
    "editor.removeImage": "Remove image",
    "editor.removeText": "Remove text",
    "cart.title": "Your cart",
    "cart.empty": "Your cart is empty",
    "cart.subtotal": "Subtotal",
    "cart.shipping": "Shipping",
    "cart.shippingCalc": "Calculated at checkout",
    "cart.total": "Total",
    "cart.checkout": "Proceed to checkout",
    "cart.continue": "Continue shopping",
    "cart.remove": "Remove",
    "cart.personalized": "Personalized",
    "cart.items": "items",
    "checkout.title": "Checkout",
    "checkout.guest": "Checkout as guest",
    "checkout.login": "Log in",
    "checkout.contact": "Contact information",
    "checkout.shipping": "Shipping address",
    "checkout.payment": "Payment method",
    "checkout.review": "Order summary",
    "checkout.firstName": "First name",
    "checkout.lastName": "Last name",
    "checkout.email": "Email",
    "checkout.phone": "Phone",
    "checkout.address": "Address",
    "checkout.city": "City",
    "checkout.state": "State / Province",
    "checkout.zip": "Zip code",
    "checkout.country": "Country",
    "checkout.card": "Credit/debit card",
    "checkout.pse": "PSE (Colombia)",
    "checkout.bankTransfer": "Bank transfer",
    "checkout.placeOrder": "Place order",
    "checkout.processing": "Processing...",
    "category.hoodies": "Hoodies",
    "category.camisetas": "T-Shirts",
    "category.filter": "Filter",
    "category.sort": "Sort",
    "category.results": "results",
    "footer.rights": "All rights reserved.",
    "footer.about": "About us",
    "footer.help": "Help",
    "footer.terms": "Terms",
    "footer.privacy": "Privacy",
    "sizeGuide.title": "Size guide",
    "sizeGuide.chest": "Chest",
    "sizeGuide.length": "Length",
    "sizeGuide.shoulder": "Shoulder",
    "sizeGuide.cm": "cm",
    "general.currency": "COP",
    "general.language": "Language",
    "general.theme": "Theme",
    "general.light": "Light",
    "general.dark": "Dark",
  },
} as const;

type TranslationKey = keyof typeof translations.es;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return saved === "en" || saved === "es" ? saved : "es";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] || key;
    },
    [language],
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
