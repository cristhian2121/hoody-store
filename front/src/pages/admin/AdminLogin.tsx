import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { adminLogin, setAdminToken } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      setAdminToken(await adminLogin(email, password));
      navigate("/admin/pedidos", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-sm py-20">
      <div className="rounded-2xl border bg-card p-8">
        <div className="mb-6 flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Panel de pedidos</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
