// RequestsView.jsx (parcheado — reemplaza el contenido del componente)
import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import CreateRequestDialog from "./CreateRequestDialog";
import RequestDetailDialog from "./RequestDetailDialog";
import EditRequestDialog from "./EditRequestDialog";
import RequestFilters from "./RequestFilters";
import RequestCard from "./RequestCard";

import api from "@/api/client";

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const RequestsView = ({
  user,
  users,
  requests,
  filters,
  setFilters,
  departments,
  setRequestDialog,
  requestDialog,
  newRequest,
  setNewRequest,
  createRequest,
  deleteRequest,
  setPage,
  page,
  pageInfo,
  total,
  pageSize,
  setPageSize,
  totalPages,
  setClassifyDialogFor,
  setClassifyData,
  setAssignDialogFor,
  setAssignData,
  setFeedbackDialogFor,
  setFeedbackData,
  takeRequest,
  rejectRequest,
  sendToReview,
  backToProgress,
  finishRequest,
  // opcional: si el padre la expone, refrescamos sin recargar la página
  fetchRequests,
}) => {
  const [viewDialogFor, setViewDialogFor] = useState(null);

  const [editDialogFor, setEditDialogFor] = useState(null);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    type: "",
    channel: "",
    department: "",
    level: "",
    estimated_hours: "",
    estimated_due: "",
    priority: "",
    assigned_to: "",
  });
  const [saving, setSaving] = useState(false);

  // Local copy of requests so podemos actualizar la lista sin recargar
  const [localRequests, setLocalRequests] = useState(requests || []);

  // Mantener sincronizado el estado local cuando el prop 'requests' cambie
  useEffect(() => {
    setLocalRequests(requests || []);
  }, [requests]);

  // ---- Helpers de fecha ----
  const toISO = (v) => {
    if (!v || !String(v).trim()) return undefined;
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };
  const isoToLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  // Abre modal de edición con datos precargados (normalizando formatos)
  const openEdit = (id, data) => {
    setEditDialogFor(id);
    setEditData({
      title: data?.title || "",
      description: data?.description || "",
      type: data?.type || "",
      channel: data?.channel || "",
      department: data?.department || "",
      level: data?.level ?? "",
      estimated_hours: data?.estimated_hours ?? "",
      estimated_due: isoToLocalInput(data?.estimated_due) || "",
      priority: data?.priority || "",
      assigned_to: data?.assigned_to || "",
    });
  };

  // Normaliza el payload a lo que espera el backend (PUT parcial)
  const normalize = (src) => {
    const out = {};
    const put = (k, v) => {
      if (v !== "" && v !== undefined && v !== null) out[k] = v;
    };

    put("title", src.title != null ? String(src.title).trim() : undefined);
    put(
      "description",
      src.description != null ? String(src.description).trim() : undefined,
    );
    put("type", src.type || undefined);
    put("channel", src.channel || undefined);
    put("department", src.department || undefined);
    put("priority", src.priority || undefined);

    if (src.level !== "" && src.level != null) put("level", Number(src.level));
    if (src.assigned_to !== "" && src.assigned_to != null)
      put("assigned_to", Number(src.assigned_to));
    if (src.estimated_hours !== "" && src.estimated_hours != null)
      put("estimated_hours", Number(src.estimated_hours));

    const iso = toISO(src.estimated_due);
    if (iso) put("estimated_due", iso);

    if (src.status) put("status", src.status);

    return out;
  };

  // === Update ===
  const updateRequest = async (id, payloadFromDialog) => {
    setSaving(true);
    try {
      const upd = payloadFromDialog;
      console.log("➡️ PUT /requests/:id", { id, upd });
      if (Object.keys(upd).length === 0) {
        setEditDialogFor(null);
        return;
      }

      // Hacemos el PUT y esperamos la respuesta (idealmente el backend devuelve el documento actualizado)
      const res = await api.put(`/requests/${id}`, upd, {
        headers: { "Content-Type": "application/json" },
      });

      // Cerrar modal
      setEditDialogFor(null);

      // Si el padre expone fetchRequests lo usamos (estado fuente de la verdad)
      if (typeof fetchRequests === "function") {
        await fetchRequests();
      } else {
        // Actualizamos localmente la lista con lo que nos devolvió la API (res.data)
        // Si la API no devuelve el recurso, podríamos hacer un GET (/requests/:id) — aquí asumimos res.data es el objeto actualizado.
        const updated = res?.data;
        if (updated && updated.id) {
          setLocalRequests((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
          );
        } else {
          // fallback conservador: si no hay res.data, intentar obtener el recurso actualizado
          try {
            const getRes = await api.get(`/requests/${id}`);
            const fresh = getRes?.data;
            if (fresh && fresh.id) {
              setLocalRequests((prev) =>
                prev.map((r) => (r.id === fresh.id ? { ...r, ...fresh } : r)),
              );
            }
          } catch (e) {
            // No hacemos reload; solo logueamos y seguimos
            console.warn("No se pudo obtener recurso actualizado:", e);
          }
        }
      }

      // Mostramos notificación después de actualizar la lista
      Swal.fire({
        icon: "success",
        title: "Solicitud actualizada correctamente",
        // text: "La solicitud se actualizó correctamente.",
        timer: 1600,
        showConfirmButton: false,
        position: "center",
      });
    } catch (error) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      console.error("❌ PUT /requests/:id error", { status, detail, error });

      Swal.fire({
        icon: "error",
        title: "Error al actualizar",
        text: Array.isArray(detail)
          ? JSON.stringify(detail)
          : detail || error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header y botón */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Solicitudes de Automatización
        </h2>
        <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Nueva Solicitud</span>
            </Button>
          </DialogTrigger>
          <CreateRequestDialog
            user={user}
            users={users}
            newRequest={newRequest}
            setNewRequest={setNewRequest}
            createRequest={createRequest}
          />
        </Dialog>
      </div>

      {/* Filtros */}
      <RequestFilters
        filters={filters}
        setFilters={setFilters}
        departments={departments}
        setPage={setPage}
        users={users}
        user={user}
      />

      <PaginationControls
        position="top"
        pageInfo={pageInfo}
        total={total}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalPages={totalPages}
      />

      {/* Lista de solicitudes (usamos localRequests ahora) */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        {localRequests.length === 0 ? (
          <div className="text-center text-gray-500 py-12 bg-white rounded-lg border xl:col-span-2">
            No hay solicitudes que coincidan con el filtro.
          </div>
        ) : (
          localRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              user={user}
              deleteRequest={deleteRequest}
              setClassifyDialogFor={setClassifyDialogFor}
              setClassifyData={setClassifyData}
              setAssignDialogFor={setAssignDialogFor}
              setAssignData={setAssignData}
              setFeedbackDialogFor={setFeedbackDialogFor}
              setFeedbackData={setFeedbackData}
              takeRequest={takeRequest}
              rejectRequest={rejectRequest}
              sendToReview={sendToReview}
              backToProgress={backToProgress}
              finishRequest={finishRequest}
              setEditDialogFor={setEditDialogFor}
              editDialogFor={editDialogFor}
              editData={editData}
              setEditData={setEditData}
              onView={(id) => setViewDialogFor(id)}
              onEdit={(id, data) => openEdit(id, data)}
            />
          ))
        )}
      </div>

      <PaginationControls
        position="bottom"
        pageInfo={pageInfo}
        total={total}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalPages={totalPages}
      />

      {/* Detalle de solicitud */}
      <RequestDetailDialog
        open={!!viewDialogFor}
        onOpenChange={(open) => setViewDialogFor(open ? viewDialogFor : null)}
        requestId={viewDialogFor}
      />

      {/* Editar solicitud */}
      <EditRequestDialog
        open={!!editDialogFor}
        onOpenChange={(open) => {
          if (!open) setEditDialogFor(null);
        }}
        requestId={editDialogFor}
        editData={editData}
        setEditData={setEditData}
        updateRequest={updateRequest}
        saving={saving}
        typeOptions={["Soporte", "Mejora", "Desarrollo", "Capacitación"]}
        channelOptions={[
          "Sistema",
          "Google Sheets",
          "Correo Electrónico",
          "WhatsApp",
        ]}
        departmentOptions={departments || []}
      />
    </div>
  );
};

// PaginationControls sin cambios (lo puedes mantener)
function PaginationControls({
  position,
  pageInfo,
  total,
  page,
  setPage,
  pageSize,
  setPageSize,
  totalPages,
}) {
  /* ... tu impl. actual ... */
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${position === "top" ? "" : "mt-6"}`}
      data-testid={`pagination-${position}`}
    >
      <div className="text-sm text-gray-600">
        Mostrando <span className="font-medium">{pageInfo.from}</span>–
        <span className="font-medium">{pageInfo.to}</span> de{" "}
        <span className="font-medium">{total}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm mr-2">Por página</label>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          {[5, 10, 20, 30].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-700">
            Página <span className="font-medium">{page}</span> / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RequestsView;
