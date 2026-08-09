import { describe, it, expect, vi, afterEach } from "vitest";
import { uploadDesignImage } from "./uploads";
import { API_URL } from "./api";

const file = () => new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" });

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);

describe("uploadDesignImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manda el archivo como multipart en el campo 'file'", async () => {
    const fetchMock = respond(201, { assetId: "a1" });
    vi.stubGlobal("fetch", fetchMock);

    await uploadDesignImage(file());

    const [url, init] = fetchMock.mock.calls[0];
    // La URL sale de VITE_API_URL, no de una ruta relativa: el frontend y el
    // backend viven en dominios distintos.
    expect(url).toBe(`${API_URL}/api/uploads/design-image`);
    expect(url).toMatch(/^https?:\/\//);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });

  // El 400 del servidor explica que le pasa a ESA imagen; taparlo con un texto
  // generico deja al cliente sin saber que corregir.
  it("propaga el mensaje del servidor en un 400", async () => {
    vi.stubGlobal(
      "fetch",
      respond(400, { message: "Las imagenes animadas no se pueden estampar." }),
    );

    await expect(uploadDesignImage(file())).rejects.toThrow(
      "Las imagenes animadas no se pueden estampar.",
    );
  });

  // Este si viene en ingles del limitador de Nest.
  it("traduce el 429 del limitador", async () => {
    vi.stubGlobal("fetch", respond(429, { message: "ThrottlerException: Too Many Requests" }));

    await expect(uploadDesignImage(file())).rejects.toThrow(/muchas imagenes seguidas/);
  });

  it("no muestra detalles internos en un 500", async () => {
    vi.stubGlobal("fetch", respond(500, { message: "ENOENT: /var/storage/designs" }));

    await expect(uploadDesignImage(file())).rejects.toThrow(/Intenta de nuevo/);
    await expect(uploadDesignImage(file())).rejects.not.toThrow(/var\/storage/);
  });

  it("da un mensaje util si el cuerpo del error no es JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => {
          throw new Error("Unexpected token <");
        },
      } as unknown as Response),
    );

    await expect(uploadDesignImage(file())).rejects.toThrow("No pudimos procesar tu imagen.");
  });

  it("traduce una caida de red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(uploadDesignImage(file())).rejects.toThrow(/conectar con el servidor/);
  });

  // El editor cancela la subida anterior al elegir otro archivo; ese abort no
  // es un error que mostrarle a nadie.
  it("deja pasar el AbortError sin envolverlo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
    );

    await expect(uploadDesignImage(file())).rejects.toMatchObject({ name: "AbortError" });
  });
});
