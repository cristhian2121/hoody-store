import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Copy, Download, RefreshCw } from "lucide-react";
import {
  AdminPrintAsset,
  AdminUnauthorizedError,
  createDownloadLink,
  downloadPrintAsset,
  fetchAdminOrder,
  fetchProofObjectUrl,
  requestRerender,
} from "@/lib/admin";
import { formatPrice } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/**
 * Miniatura de la prueba.
 *
 * Se descarga como blob porque un `<img src>` normal no manda la cabecera
 * Authorization, y estas imágenes son diseños de clientes: no pueden quedar
 * accesibles sin sesión.
 */
const Proof = ({ printAssetId }: { printAssetId: string }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    fetchProofObjectUrl(printAssetId)
      .then((result) => {
        if (cancelled) {
          URL.revokeObjectURL(result);
          return;
        }
        objectUrl = result;
        setUrl(result);
      })
      .catch(() => setUrl(null));

    // Sin revocar, cada visita a la página filtra el blob completo en memoria.
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [printAssetId]);

  if (!url) return <Skeleton className="h-40 w-40 rounded-lg" />;

  return (
    <img
      src={url}
      alt="Prueba del estampado"
      className="h-40 w-40 rounded-lg border bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] object-contain"
    />
  );
};

const PRINT_STATUS_LABEL: Record<AdminPrintAsset["status"], string> = {
  pending: "En cola",
  rendering: "Renderizando",
  ready: "Listo",
  failed: "Con error",
};

const AdminOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => fetchAdminOrder(id as string),
    enabled: Boolean(id),
    refetchInterval: 10_000,
    retry: false,
  });

  useEffect(() => {
    if (error instanceof AdminUnauthorizedError) navigate("/admin", { replace: true });
  }, [error, navigate]);

  const rerender = useMutation({
    mutationFn: () => requestRerender(id as string),
    onSuccess: (result) => {
      toast.success(`${result.queued} archivo(s) vueltos a encolar.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "order", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo reencolar."),
  });

  const shareLink = useMutation({
    mutationFn: () => createDownloadLink(id as string),
    onSuccess: async ({ url, expiresInMinutes }) => {
      await navigator.clipboard.writeText(url).catch(() => undefined);
      toast.success(`Link copiado. Expira en ${expiresInMinutes} minutos.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo generar el link."),
  });

  if (isLoading) {
    return (
      <div className="container space-y-4 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">No pudimos cargar el pedido.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/admin/pedidos">Volver</Link>
        </Button>
      </div>
    );
  }

  const { order, printAssets } = data;
  const designsById = new Map(
    order.orderItems.flatMap((item) => item.designs.map((design) => [design.id, design])),
  );
  const anyReady = printAssets.some((asset) => asset.status === "ready");

  return (
    <div className="container py-10">
      <Link
        to="/admin/pedidos"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Pedidos
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold">#{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleString("es-CO")} · {order.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => shareLink.mutate()}
            disabled={!anyReady || shareLink.isPending}
          >
            <Copy className="mr-1 h-4 w-4" /> Link del ZIP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => rerender.mutate()}
            disabled={rerender.isPending}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Volver a generar
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-3 font-semibold">Artículos</h2>
            {order.orderItems.length === 0 ? (
              // Las órdenes anteriores a la normalización no tienen líneas.
              <p className="text-sm text-muted-foreground">
                Este pedido es anterior al detalle por línea.
              </p>
            ) : (
              <div className="space-y-2">
                {order.orderItems.map((item) => (
                  <div key={item.id} className="rounded-xl border bg-card p-4">
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.productNameEs}</p>
                        <p className="text-sm text-muted-foreground">
                          Talla {item.size} · {item.colorNameEs} · {item.gender} · x{item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">{formatPrice(item.lineTotalCop)}</p>
                    </div>
                    {item.designs.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {item.designs.map((design) => (
                          <Badge key={design.id} variant="secondary" className="text-[10px]">
                            {design.side === "front" ? "Frente" : "Espalda"} ·{" "}
                            {Number(design.printAreaWidthMm)}×{Number(design.printAreaHeightMm)} mm
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Arte para imprimir</h2>
            {printAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este pedido no lleva estampado.</p>
            ) : (
              <div className="space-y-3">
                {printAssets.map((asset) => {
                  const design = designsById.get(asset.designId);
                  return (
                    <div key={asset.id} className="flex gap-4 rounded-xl border bg-card p-4">
                      {asset.status === "ready" ? (
                        <Proof printAssetId={asset.id} />
                      ) : (
                        <div className="flex h-40 w-40 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                          {PRINT_STATUS_LABEL[asset.status]}
                        </div>
                      )}
                      <div className="flex-1 space-y-1 text-sm">
                        <p className="font-medium">
                          {design
                            ? `${design.side === "front" ? "Frente" : "Espalda"} · ${design.category}`
                            : "Diseño"}
                        </p>
                        {asset.widthPx && (
                          <p className="text-muted-foreground">
                            {asset.widthPx}×{asset.heightPx} px a {asset.dpi} dpi ·{" "}
                            {Math.round((asset.bytes ?? 0) / 1024)} KB
                          </p>
                        )}
                        {asset.rendererVersion && (
                          <p className="text-xs text-muted-foreground">
                            renderer v{asset.rendererVersion} · intento {asset.attempts}
                          </p>
                        )}
                        {asset.lastError && (
                          <p className="text-xs text-destructive">{asset.lastError}</p>
                        )}
                        {asset.status === "ready" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() =>
                              downloadPrintAsset(
                                asset.id,
                                `${order.id.slice(0, 8)}-${design?.side ?? "arte"}-${asset.dpi}dpi.png`,
                              ).catch(() => toast.error("No pudimos descargar el archivo."))
                            }
                          >
                            <Download className="mr-1 h-4 w-4" /> Descargar PNG
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Cliente</h2>
            <p>
              {order.customer.firstName} {order.customer.lastName}
            </p>
            <p className="text-muted-foreground">{order.customer.email}</p>
            <p className="text-muted-foreground">{order.customer.phone}</p>
          </div>

          <div className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Envío</h2>
            <p>{order.shipping.address}</p>
            <p className="text-muted-foreground">
              {order.shipping.city}, {order.shipping.department}
            </p>
            <p className="text-muted-foreground">{order.shipping.country}</p>
          </div>

          <div className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Totales</h2>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(Number(order.totals.subtotal) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío</span>
              <span>{formatPrice(Number(order.totals.shipping) || 0)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>{formatPrice(Number(order.totals.total) || 0)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
