import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Clock, LogOut } from "lucide-react";
import {
  AdminOrderSummary,
  AdminUnauthorizedError,
  clearAdminToken,
  fetchAdminOrders,
} from "@/lib/admin";
import { formatPrice } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<string, string> = {
  checkout_created: "Sin pagar",
  paid: "Pagado",
  payment_pending: "Pago pendiente",
  payment_failed: "Pago fallido",
  payment_unknown: "Estado desconocido",
  payment_review: "Revisar monto",
};

const statusVariant = (status: string) =>
  status === "paid" ? "default" : status === "payment_review" ? "destructive" : "secondary";

/** Resume el estado del arte de una orden en una sola señal visual. */
const PrintStatus = ({ printAssets }: { printAssets: AdminOrderSummary["printAssets"] }) => {
  if (printAssets.total === 0) {
    return <span className="text-xs text-muted-foreground">Sin estampado</span>;
  }
  if (printAssets.failed > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> {printAssets.failed} con error
      </span>
    );
  }
  if (printAssets.pending > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Renderizando ({printAssets.ready}/{printAssets.total})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600">
      <CheckCircle2 className="h-3.5 w-3.5" /> {printAssets.ready} listo(s)
    </span>
  );
};

const AdminOrders = () => {
  const navigate = useNavigate();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: fetchAdminOrders,
    // El arte se renderiza en segundo plano: sin esto habria que recargar a
    // mano para ver cuando termina.
    refetchInterval: 10_000,
    retry: false,
  });

  useEffect(() => {
    if (error instanceof AdminUnauthorizedError) {
      navigate("/admin", { replace: true });
    }
  }, [error, navigate]);

  const logout = () => {
    clearAdminToken();
    navigate("/admin", { replace: true });
  };

  return (
    <div className="container py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-1 h-4 w-4" /> Salir
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <p className="text-muted-foreground">Todavía no hay pedidos.</p>
      )}

      <div className="space-y-2">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/admin/pedidos/${order.id}`}
            className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <Badge variant={statusVariant(order.status)} className="text-[10px]">
                  {STATUS_LABEL[order.status] ?? order.status}
                </Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {order.customerName}
                {order.city ? ` · ${order.city}` : ""} ·{" "}
                {new Date(order.createdAt).toLocaleString("es-CO")}
              </p>
            </div>

            <PrintStatus printAssets={order.printAssets} />

            <div className="text-right">
              <p className="font-semibold">{formatPrice(order.total)}</p>
              <p className="text-xs text-muted-foreground">{order.itemCount} artículo(s)</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminOrders;
