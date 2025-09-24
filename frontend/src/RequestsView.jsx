// src/RequestsView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "./App";
import { RequestsAPI } from "./api/client";

// UI (shadcn)
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";

// Componentes ya existentes en tu repo
import RequestCard from "./components/requests/RequestCard";
import RequestFilters from "./components/requests/RequestFilters";
import CreateRequestDialog from "./components/requests/CreateRequestDialog";
import ClassifyDialog from "./components/requests/ClassifyDialog";
import AssignDialog from "./components/requests/AssignDialog";
import FeedbackDialog from "./components/requests/FeedbackDialog";

export default function RequestsView() {
  const { user } = useAuth();

  // listado
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });

  // paginación
  const [page, setPage] = useState(Number(localStorage.getItem("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(localStorage.getItem("pageSize")) || 10);
  useEffect(() => localStorage.setItem("page", String(page)), [page]);
  useEffect(() => localStorage.setItem("pageSize", String(pageSize)), [pageSize]);

  // filtros (los iniciales son seguros; RequestFilters puede sobreescribirlos)
  const [filters, setFilters] = useState({
    status: "all",
    department: "all",
    type: "all",
    level: "all",
    channel: "all",
    q: "",
    sort: "-created_at",
  });

  // diálogos
  const [openCreate, setOpenCreate] = useState(false);
  const [classifyFor, setClassifyFor] = useState(null);   // objeto request o id
  const [assignFor, setAssignFor] = useState(null);
  const [feedbackFor, setFeedbackFor] = useState(null);

  // carga
  useEffect(() => {
    (async () => {
      try {
        const params = {
          page,
          page_size: pageSize,
          sort: filters.sort,
          q: filters.q?.trim() || undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          department: filters.department !== "all" ? filters.department : undefined,
          type: filters.type !== "all" ? filters.type : undefined,
          // level es string (p.ej. "Simple/Avanzado/Complejo") en el proyecto actual
          level: filters.level !== "all" ? filters.level : undefined,
          channel: filters.channel !== "all" ? filters.channel : undefined,
        };
        const { data } = await RequestsAPI.list(params);
        setItems(data.items || []);
        setMeta({ total: data.total || 0, total_pages: data.total_pages || 1 });
      } catch {
        setItems([]);
        setMeta({ total: 0, total_pages: 1 });
        toast.error("Error al cargar solicitudes");
      }
    })();
  }, [page, pageSize, filters]);

  // handlers
  const onCreate = async (payload) => {
    await RequestsAPI.create(payload);
    toast.success("Solicitud creada");
    setOpenCreate(false);
    setPage(1);
  };

  const onSoftDelete = async (id) => {
    if (!window.confirm("¿Enviar a papelera por 14 días?")) return;
    await RequestsAPI.softDelete(id);
    toast.success("Enviado a papelera");
    setPage(1);
  };

  const onClassify = async (id, payload) => {
    await RequestsAPI.classify(id, payload);
    toast.success("Clasificada");
    setClassifyFor(null);
  };

  const onAssign = async (id, payload) => {
    await RequestsAPI.assign(id, payload);
    toast.success("Asignada");
    setAssignFor(null);
  };

  const onTransition = async (id, to_status, extra = {}) => {
    await RequestsAPI.transition(id, { to_status, ...extra });
    toast.success(`Estado: ${to_status}`);
  };

  const onFeedback = async (id, payload) => {
    await RequestsAPI.feedback(id, payload);
    toast.success("¡Gracias por el feedback!");
    setFeedbackFor(null);
  };

  const pageFrom = meta.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageTo = Math.min(page * pageSize, meta.total);

  return (
    <div className="space-y-4">
      {/* header de la sección */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Solicitudes de Automatización</h2>
        <Button onClick={() => setOpenCreate(true)}>Nueva Solicitud</Button>
      </div>

      {/* filtros (tu componente ya maneja cats dinámicos desde /api/meta/options) */}
      <RequestFilters
        value={filters}
        onChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />

      {/* lista */}
      <div className="grid gap-4">
        {items.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            me={user}
            onSoftDelete={onSoftDelete}
            onClassify={() => setClassifyFor(r)}
            onAssign={() => setAssignFor(r)}
            onTransition={onTransition}
            onFeedback={() => setFeedbackFor(r)}
          />
        ))}
        {items.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No hay solicitudes que coincidan con el filtro.
            </CardContent>
          </Card>
        )}
      </div>

      {/* paginación */}
      <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-600">
          Mostrando <span className="font-medium">{pageFrom}</span>–<span className="font-medium">{pageTo}</span> de{" "}
          <span className="font-medium">{meta.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm mr-2">Por página</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(parseInt(v, 10));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <span className="text-sm text-gray-700">
              Página <span className="font-medium">{page}</span> / {meta.total_pages}
            </span>
            <Button
              variant="outline"
              disabled={page >= meta.total_pages}
              onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {/* diálogos */}
      <CreateRequestDialog open={openCreate} onOpenChange={setOpenCreate} onSubmit={onCreate} />

      <ClassifyDialog
        open={!!classifyFor}
        initial={classifyFor}
        onOpenChange={() => setClassifyFor(null)}
        onSubmit={(payload) => onClassify(classifyFor?.id, payload)}
      />

      <AssignDialog
        open={!!assignFor}
        initial={assignFor}
        onOpenChange={() => setAssignFor(null)}
        onSubmit={(payload) => onAssign(assignFor?.id, payload)}
      />

      <FeedbackDialog
        open={!!feedbackFor}
        initial={feedbackFor}
        onOpenChange={() => setFeedbackFor(null)}
        onSubmit={(payload) => onFeedback(feedbackFor?.id, payload)}
      />
    </div>
  );
}
