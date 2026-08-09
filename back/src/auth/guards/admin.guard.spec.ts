import { UnauthorizedException } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";
import { AuthService } from "../../services/auth.service";

const buildContext = (authorization?: string) => {
  const request: Record<string, unknown> = { headers: { authorization } };
  return {
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never,
    request,
  };
};

describe("AdminGuard", () => {
  let authService: jest.Mocked<AuthService>;
  let guard: AdminGuard;

  beforeEach(() => {
    authService = { verifyToken: jest.fn() } as unknown as jest.Mocked<AuthService>;
    guard = new AdminGuard(authService);
  });

  it("rechaza cuando no hay header Authorization", async () => {
    const { context } = buildContext(undefined);
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });

  it("rechaza un esquema distinto de Bearer", async () => {
    const { context } = buildContext("Basic YWRtaW46YWRtaW4=");
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });

  it("rechaza un Bearer sin valor", async () => {
    const { context } = buildContext("Bearer ");
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("rechaza cuando el token no verifica", async () => {
    authService.verifyToken.mockRejectedValue(new Error("expirado"));
    const { context } = buildContext("Bearer tok-invalido");
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("acepta un token valido y expone el payload en el request", async () => {
    const payload = { sub: "admin@atuestampa.com", role: "admin" as const };
    authService.verifyToken.mockResolvedValue(payload);
    const { context, request } = buildContext("Bearer tok-valido");

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.verifyToken).toHaveBeenCalledWith("tok-valido");
    expect(request.admin).toEqual(payload);
  });

  it("acepta 'bearer' en minusculas", async () => {
    authService.verifyToken.mockResolvedValue({ sub: "admin", role: "admin" });
    const { context } = buildContext("bearer tok-valido");
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
