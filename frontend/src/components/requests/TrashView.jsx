import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export default function TrashView({ api }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });

  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);

  // estados de loading
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [purgingAll, setPurgingAll] = useState(false);

  const addProcessing = (id) =>
    setProcessingIds((prev) => {
      const copy = new Set(prev);
      copy.add(id);
      return copy;
    });
  const removeProcessing = (id) =>
    setProcessingIds((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });

  const purgeAll = async () => {
    // confirmo con modal (más visible que toast)
    const res = await Swal.fire({
      title: "Vaciar papelera",
      text: "¿Eliminar permanentemente todas las solicitudes en la papelera?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar todo",
      cancelButtonText: "Cancelar",
    });
    if (!res.isConfirmed) return;

    setPurgingAll(true);
    try {
      await api.delete("/requests/trash");
      await Swal.fire({
        icon: "success",
        title: "Papelera vaciada",
        timer: 1400,
        showConfirmButton: false,
        position: "center",
      });
      await load();
      setConfirmPurgeAll(false);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.detail || "No se pudo vaciar la papelera");
    } finally {
      setPurgingAll(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      if (q.trim()) params.set("q", q.trim());
      const { data } = await api.get(`/requests/trash?${params.toString()}`);
      setItems(data.items || []);
      setMeta({ total: data.total, total_pages: data.total_pages });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar la papelera");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize]);

  const restore = async (id) => {
    if (processingIds.has(id)) return;
    addProcessing(id);
    try {
      await api.post(`/requests/${id}/restore`);
      await Swal.fire({
        icon: "success",
        title: "Solicitud restaurada",
        timer: 1200,
        showConfirmButton: false,
        position: "center",
      });
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.detail || "No se pudo restaurar");
    } finally {
      removeProcessing(id);
    }
  };

  const purge = async (id) => {
    if (processingIds.has(id)) return;
    const res = await Swal.fire({
      title: "Eliminar definitivamente",
      text: "¿Eliminar esta solicitud permanentemente?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!res.isConfirmed) return;

    addProcessing(id);
    try {
      await api.delete(`/requests/trash/${id}`);
      await Swal.fire({
        icon: "success",
        title: "Eliminada definitivamente",
        timer: 1200,
        showConfirmButton: false,
        position: "center",
      });
      await load();
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.detail || "No se pudo eliminar definitivamente",
      );
    } finally {
      removeProcessing(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Label className="text-sm">Buscar</Label>
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Título o descripción..."
              disabled={loading}
            />
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                load();
              }}
              disabled={loading}
            >
              {loading ? "Buscando…" : "Buscar"}
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-sm">Por página</Label>
          <Input
            type="number"
            min="5"
            max="50"
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value || 10, 10));
              setPage(1);
            }}
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog open={confirmPurgeAll} onOpenChange={setConfirmPurgeAll}>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              className="ml-auto"
              disabled={purgingAll}
            >
              {purgingAll ? "Eliminando…" : "Vaciar Papelera"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Vaciar la papelera?</DialogTitle>
              <DialogDescription>
                Esto eliminará <strong>permanentemente</strong> todas las
                solicitudes en la papelera.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmPurgeAll(false)}
                disabled={purgingAll}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={purgeAll}
                disabled={purgingAll}
              >
                {purgingAll ? "Eliminando…" : "Eliminar todo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Cargando papelera…
            </CardContent>
          </Card>
        ) : (
          <>
            {items.map((it) => (
              <Card key={it.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{it.title}</CardTitle>
                    <CardDescription>
                      {it.department} • {it.requester_name}
                    </CardDescription>
                  </div>
                  <div className="text-sm text-gray-500">
                    Eliminada: {new Date(it.deleted_at).toLocaleString()}
                    <br />
                    Expira: {new Date(it.expires_at).toLocaleString()}
                  </div>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    onClick={() => restore(it.id)}
                    disabled={processingIds.has(it.id)}
                  >
                    {processingIds.has(it.id) ? "Procesando…" : "Restaurar"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => purge(it.id)}
                    disabled={processingIds.has(it.id)}
                  >
                    {processingIds.has(it.id)
                      ? "Procesando…"
                      : "Eliminar definitivamente"}
                  </Button>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No hay elementos en la papelera.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Total: <span className="font-medium">{meta.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm">
            Página {page}/{meta.total_pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= meta.total_pages || loading}
            onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
