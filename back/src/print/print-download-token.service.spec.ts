import { UnauthorizedException } from "@nestjs/common";
import { PrintDownloadTokenService } from "./print-download-token.service";

const ORDER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("PrintDownloadTokenService", () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousTtl = process.env.PRINT_DOWNLOAD_TTL_MINUTES;

  beforeEach(() => {
    process.env.JWT_SECRET = "x".repeat(48);
    process.env.BACKEND_URL = "https://api.atuestampa.test";
    delete process.env.PRINT_DOWNLOAD_TTL_MINUTES;
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousTtl === undefined) delete process.env.PRINT_DOWNLOAD_TTL_MINUTES;
    else process.env.PRINT_DOWNLOAD_TTL_MINUTES = previousTtl;
  });

  const service = () => new PrintDownloadTokenService();

  it("acepta el token que emitio", () => {
    const s = service();
    const { token } = s.issue(ORDER);
    expect(() => s.assertValid(ORDER, token)).not.toThrow();
  });

  // El link viaja por WhatsApp y se puede reenviar: tiene que servir para una
  // sola orden y para nada mas.
  it("no sirve para otra orden", () => {
    const s = service();
    const { token } = s.issue(ORDER);
    expect(() => s.assertValid(OTHER, token)).toThrow(UnauthorizedException);
  });

  it("rechaza una firma alterada", () => {
    const s = service();
    const { token } = s.issue(ORDER);
    const [expiry, signature] = token.split(".");
    const tampered = `${expiry}.${signature.replace(/^./, (c) => (c === "a" ? "b" : "a"))}`;

    expect(() => s.assertValid(ORDER, tampered)).toThrow(UnauthorizedException);
  });

  // Extender la vigencia a mano es el ataque obvio contra un token con fecha.
  it("rechaza una expiracion movida sin refirmar", () => {
    const s = service();
    const { token } = s.issue(ORDER);
    const signature = token.split(".")[1];
    const futuro = `${Date.now() + 10 * 365 * 24 * 3600_000}.${signature}`;

    expect(() => s.assertValid(ORDER, futuro)).toThrow(UnauthorizedException);
  });

  it("rechaza un token vencido", () => {
    process.env.PRINT_DOWNLOAD_TTL_MINUTES = "60";
    const s = service();
    const { token } = s.issue(ORDER);

    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 61 * 60_000);
    try {
      expect(() => s.assertValid(ORDER, token)).toThrow(/expiro/i);
    } finally {
      jest.restoreAllMocks();
    }
  });

  it.each([undefined, "", "sin-punto", "abc.def", "123.", ".firma"])(
    "rechaza el token %p",
    (token) => {
      expect(() => service().assertValid(ORDER, token as string)).toThrow(UnauthorizedException);
    },
  );

  it("respeta PRINT_DOWNLOAD_TTL_MINUTES", () => {
    process.env.PRINT_DOWNLOAD_TTL_MINUTES = "15";
    expect(service().issue(ORDER).expiresInMinutes).toBe(15);
  });

  it("ignora un ttl invalido en vez de emitir un token eterno", () => {
    process.env.PRINT_DOWNLOAD_TTL_MINUTES = "no-es-un-numero";
    expect(service().issue(ORDER).expiresInMinutes).toBe(60);
  });

  it("arma una url absoluta que apunta al bundle de esa orden", () => {
    const { url } = service().downloadUrl(ORDER);
    expect(url).toMatch(
      new RegExp(
        `^https://api\\.atuestampa\\.test/api/print/orders/${ORDER}/bundle\\.zip\\?token=`,
      ),
    );
  });

  // Sin secreto no se puede firmar nada: es preferible no arrancar a emitir
  // links que cualquiera pueda falsificar.
  it("no se construye sin un JWT_SECRET suficientemente largo", () => {
    process.env.JWT_SECRET = "corto";
    expect(() => new PrintDownloadTokenService()).toThrow(/JWT_SECRET/);

    delete process.env.JWT_SECRET;
    expect(() => new PrintDownloadTokenService()).toThrow(/JWT_SECRET/);
  });

  it("dos tokens de la misma orden no son iguales al pasar el tiempo", () => {
    const s = service();
    const primero = s.issue(ORDER).token;
    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 1000);
    const segundo = s.issue(ORDER).token;
    jest.restoreAllMocks();

    expect(primero).not.toBe(segundo);
  });
});
