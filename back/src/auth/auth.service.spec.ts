import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuthService } from "../services/auth.service";

const PASSWORD = "clave-de-prueba";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const buildConfig = (overrides: Record<string, string | undefined> = {}) => {
  const values: Record<string, string | undefined> = {
    ADMIN_EMAIL: "admin@atuestampa.com",
    ADMIN_PASSWORD_HASH: PASSWORD_HASH,
    JWT_EXPIRES_IN: "12h",
    ...overrides,
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
};

const buildJwt = () =>
  ({
    signAsync: jest.fn().mockResolvedValue("signed.jwt.token"),
    verifyAsync: jest.fn(),
  }) as unknown as JwtService;

describe("AuthService", () => {
  describe("configuracion", () => {
    it("no arranca sin ADMIN_EMAIL", () => {
      expect(() => new AuthService(buildConfig({ ADMIN_EMAIL: undefined }), buildJwt())).toThrow(
        "ADMIN_EMAIL",
      );
    });

    it("no arranca sin ADMIN_PASSWORD_HASH", () => {
      expect(
        () => new AuthService(buildConfig({ ADMIN_PASSWORD_HASH: undefined }), buildJwt()),
      ).toThrow("ADMIN_PASSWORD_HASH");
    });

    it("rechaza una clave en texto plano puesta como hash", () => {
      expect(
        () => new AuthService(buildConfig({ ADMIN_PASSWORD_HASH: "admin123" }), buildJwt()),
      ).toThrow(/bcrypt hash/);
    });
  });

  describe("login", () => {
    it("devuelve un token con credenciales correctas", async () => {
      const jwt = buildJwt();
      const service = new AuthService(buildConfig(), jwt);

      const result = await service.login("admin@atuestampa.com", PASSWORD);

      expect(result.accessToken).toBe("signed.jwt.token");
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: "admin@atuestampa.com",
        role: "admin",
      });
    });

    it("acepta el email sin importar mayusculas ni espacios", async () => {
      const service = new AuthService(buildConfig(), buildJwt());
      await expect(service.login("  ADMIN@AtuEstampa.com ", PASSWORD)).resolves.toBeDefined();
    });

    it("rechaza una clave incorrecta", async () => {
      const service = new AuthService(buildConfig(), buildJwt());
      await expect(service.login("admin@atuestampa.com", "otra-clave")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rechaza un email desconocido", async () => {
      const service = new AuthService(buildConfig(), buildJwt());
      await expect(service.login("otro@ejemplo.com", PASSWORD)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("no firma token cuando las credenciales fallan", async () => {
      const jwt = buildJwt();
      const service = new AuthService(buildConfig(), jwt);

      await expect(service.login("otro@ejemplo.com", "mala")).rejects.toThrow();
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });

  describe("verifyToken", () => {
    it("acepta un token con rol admin", async () => {
      const jwt = buildJwt();
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({
        sub: "admin@atuestampa.com",
        role: "admin",
      });
      const service = new AuthService(buildConfig(), jwt);

      await expect(service.verifyToken("tok")).resolves.toEqual({
        sub: "admin@atuestampa.com",
        role: "admin",
      });
    });

    it("rechaza un token valido pero sin rol admin", async () => {
      const jwt = buildJwt();
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: "alguien", role: "customer" });
      const service = new AuthService(buildConfig(), jwt);

      await expect(service.verifyToken("tok")).rejects.toThrow(UnauthorizedException);
    });
  });
});
