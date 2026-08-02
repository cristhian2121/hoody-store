import { getPublicAssetsBaseUrl, toPublicUrl, toRemoteFetchableUrl } from "./product-url.util";

describe("product-url.util", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getPublicAssetsBaseUrl", () => {
    it("usa PUBLIC_ASSETS_BASE_URL cuando esta definida", () => {
      process.env.PUBLIC_ASSETS_BASE_URL = "https://cdn.atuestampa.com/assets";
      expect(getPublicAssetsBaseUrl()).toBe("https://cdn.atuestampa.com/assets");
    });

    it("le quita el slash final", () => {
      process.env.PUBLIC_ASSETS_BASE_URL = "https://cdn.atuestampa.com/assets///";
      expect(getPublicAssetsBaseUrl()).toBe("https://cdn.atuestampa.com/assets");
    });

    it("cae a BACKEND_URL + /static", () => {
      delete process.env.PUBLIC_ASSETS_BASE_URL;
      process.env.BACKEND_URL = "https://api.atuestampa.com";
      expect(getPublicAssetsBaseUrl()).toBe("https://api.atuestampa.com/static");
    });

    it("cae a localhost cuando no hay nada configurado", () => {
      delete process.env.PUBLIC_ASSETS_BASE_URL;
      delete process.env.BACKEND_URL;
      expect(getPublicAssetsBaseUrl()).toBe("http://localhost:4242/static");
    });
  });

  describe("toPublicUrl", () => {
    beforeEach(() => {
      delete process.env.PUBLIC_ASSETS_BASE_URL;
      process.env.BACKEND_URL = "https://api.atuestampa.com";
    });

    it("compone la URL absoluta desde una clave relativa", () => {
      expect(toPublicUrl("products/hoodie-black.jpg")).toBe(
        "https://api.atuestampa.com/static/products/hoodie-black.jpg",
      );
    });

    it("no duplica el slash si la clave empieza con uno", () => {
      expect(toPublicUrl("/products/hoodie-black.jpg")).toBe(
        "https://api.atuestampa.com/static/products/hoodie-black.jpg",
      );
    });
  });

  describe("toRemoteFetchableUrl", () => {
    beforeEach(() => {
      delete process.env.PUBLIC_ASSETS_BASE_URL;
    });

    it("devuelve la URL cuando es alcanzable desde internet", () => {
      process.env.BACKEND_URL = "https://api.atuestampa.com";
      expect(toRemoteFetchableUrl("products/x.jpg")).toBe(
        "https://api.atuestampa.com/static/products/x.jpg",
      );
    });

    // Mercado Pago descarga picture_url desde sus servidores: una URL local
    // no le sirve y es mejor omitir el campo que mandar algo inalcanzable.
    it("devuelve undefined con localhost", () => {
      process.env.BACKEND_URL = "http://localhost:4242";
      expect(toRemoteFetchableUrl("products/x.jpg")).toBeUndefined();
    });

    it("devuelve undefined con 127.0.0.1", () => {
      process.env.BACKEND_URL = "http://127.0.0.1:4242";
      expect(toRemoteFetchableUrl("products/x.jpg")).toBeUndefined();
    });

    it("no confunde un dominio que solo contiene 'localhost'", () => {
      process.env.BACKEND_URL = "https://localhost-api.atuestampa.com";
      expect(toRemoteFetchableUrl("products/x.jpg")).toBe(
        "https://localhost-api.atuestampa.com/static/products/x.jpg",
      );
    });

    it("acepta un tunel ngrok", () => {
      process.env.BACKEND_URL = "https://abc123.ngrok-free.app";
      expect(toRemoteFetchableUrl("products/x.jpg")).toBe(
        "https://abc123.ngrok-free.app/static/products/x.jpg",
      );
    });
  });
});
