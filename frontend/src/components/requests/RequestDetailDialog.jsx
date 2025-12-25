import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notifyAuthExpired } from "@/utils/session";
import { deriveHistory as buildHistoryTimeline } from "./historyUtils";

/* -------------------- BASE URL robusto (Vite/CRA + proxy Netlify) -------------------- */
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const ENV_URL = (() => {
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_BACKEND_URL
  ) {
    return process.env.REACT_APP_BACKEND_URL;
  }

  if (typeof window !== "undefined") {
    const globals = window.__API_URL || window.API_URL || window.BACKEND_URL;
    if (globals) return globals;
  }

  return isLocal ? "http://localhost:8000" : "";
})();

// En local usamos URL explícita; en prod usamos el proxy /api (definido en netlify.toml)
const baseURL = isLocal ? `${ENV_URL.replace(/\/+$/, "")}/api` : "/api";

/* -------------------- Axios con token (Bearer) -------------------- */
const api = axios.create({
  baseURL,
  withCredentials: false, // usamos Authorization, no cookies
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const stored =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (stored) {
    const raw = stored.trim();
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* -------------------- Helpers de UI -------------------- */
const colorStatus = (s) =>
  ({
    Pendiente: "bg-yellow-100 text-yellow-800",
    "En progreso": "bg-blue-100 text-blue-800",
    "En revisión": "bg-purple-100 text-purple-800",
    Finalizada: "bg-green-100 text-green-800",
    Rechazada: "bg-red-100 text-red-800",
  })[s] || "bg-gray-100 text-gray-800";

const colorPri = (p) =>
  ({
    Alta: "bg-red-100 text-red-800",
    Media: "bg-yellow-100 text-yellow-800",
    Baja: "bg-green-100 text-green-800",
  })[p] || "bg-gray-100 text-gray-800";

const fmt = (d) => {
  try {
    return d ? new Date(d).toLocaleString() : "-";
  } catch {
    return d || "-";
  }
};

export const deriveHistory = (data) => {
  const baseHistory = Array.isArray(data?.history) ? data.history : [];
  const knownTimestampKeys = [
    { key: "created_at", label: "Creado" },
    { key: "requested_at", label: "Solicitado" },
    { key: "assigned_at", label: "Asignado" },
    { key: "in_progress_at", label: "En progreso" },
    { key: "in_review_at", label: "En revisión" },
    { key: "finished_at", label: "Finalizada" },
    { key: "rejected_at", label: "Rechazada" },
    { key: "closed_at", label: "Cerrada" },
    { key: "updated_at", label: "Actualizado" },
  ];

  const timeline = [...baseHistory];

  // Soportamos estructuras tipo { status: fecha }
  const statusMap =
    data && typeof data === "object" && !Array.isArray(data)
      ? data.status_history || data.status_timestamps || data.status_dates
      : null;

  if (statusMap && typeof statusMap === "object") {
    Object.entries(statusMap).forEach(([status, at]) => {
      if (at) timeline.push({ at, from: null, to: status });
    });
  }

  knownTimestampKeys.forEach(({ key, label }) => {
    const value = data?.[key];
    if (value) timeline.push({ at: value, from: null, to: label });
  });

  return timeline
    .filter((entry) => entry && (entry.at || entry.to))
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
};

function Field({ label, value }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium">{value ?? "-"}</div>
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="max-h-64 overflow-auto rounded-lg border overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-medium text-gray-700">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i} className="border-t">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-2">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-3 py-6 text-center text-gray-500"
                colSpan={headers.length}
              >
                Sin datos
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------- Componente principal -------------------- */
export default function RequestDetailDialog({ open, onOpenChange, requestId }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const abortRef = useRef(null);
  const historyRows = useMemo(() => buildHistoryTimeline(data), [data]);

  useEffect(() => {
    if (!open || !requestId) return;

    // Cancela request previo si existe
    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErr(null);

    api
      .get(`/requests/${requestId}`, { signal: controller.signal })
      .then((r) => setData(r.data))
      .catch((e) => {
        if (axios.isCancel(e)) return;
        const status = e?.response?.status;
        if (status === 401) {
          notifyAuthExpired();
          setErr("No autenticado. Inicia sesión nuevamente.");
        } else if (status === 403)
          setErr("No autorizado para ver esta solicitud.");
        else if (status === 404) setErr("Solicitud no encontrada.");
        else setErr(e?.response?.data?.detail || e.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, requestId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-auto max-w-3xl sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de la solicitud</DialogTitle>
        </DialogHeader>

        {loading && <div className="text-sm text-gray-500">Cargando…</div>}
        {err && <div className="text-sm text-red-600">{err}</div>}

        {data && !loading && !err && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="text-lg font-semibold">{data.title}</div>
                <div className="text-sm text-gray-600">
                  {data.requester_name || data.requested_by?.name || "-"}
                  {" • "}
                  {data.department || data.department_name || "-"}
                  {" • "}
                  {fmt(data.created_at)}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Badge className={colorPri(data.priority)}>
                  {data.priority || "-"}
                </Badge>
                <Badge className={colorStatus(data.status)}>
                  {data.status || "-"}
                </Badge>
              </div>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2">
                <TabsTrigger value="overview">Resumen</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
                <TabsTrigger value="worklogs">Worklogs</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <Field label="Tipo" value={data.type} />
                  <Field label="Canal" value={data.channel} />
                  <Field label="Nivel" value={data.level ?? "-"} />
                  <Field
                    label="Asignado a"
                    value={
                      data.assigned_to_name || data.assigned_to?.name || "-"
                    }
                  />
                  <Field
                    label="Compromiso"
                    value={
                      data.estimated_due
                        ? new Date(data.estimated_due).toLocaleDateString()
                        : "-"
                    }
                  />
                  <Field
                    label="Estimado (h)"
                    value={data.estimated_hours ?? "-"}
                  />
                  <div className="col-span-2">
                    <div className="text-gray-500">Descripción</div>
                    <div className="whitespace-pre-wrap">
                      {data.description || "-"}
                    </div>
                  </div>
                </div>
                {data.review_evidence?.url && (
                  <a
                    className="text-sm underline"
                    target="_blank"
                    rel="noreferrer"
                    href={data.review_evidence.url}
                  >
                    Ver evidencia
                  </a>
                )}
              </TabsContent>

              <TabsContent value="history">
                <div className="rounded-lg border bg-white">
                  <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Historial de estados
                      </div>
                      <p className="text-xs text-gray-500">
                        Ordenado del más antiguo al más reciente.
                      </p>
                    </div>
                  </div>
                  <ScrollArea className="max-h-72">
                    {historyRows.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-500">
                        Sin movimientos registrados.
                      </div>
                    ) : (
                      <ul className="divide-y">
                        {historyRows.map((h, idx) => (
                          <li
                            key={`${h.at || idx}-${h.to || idx}`}
                            className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                                  {idx + 1}
                                </span>
                                <span>
                                  {h.from ? `${h.from} → ${h.to}` : h.to || "-"}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1 space-x-2">
                                <span>{fmt(h.at)}</span>
                                {h.durationLabel && (
                                  <span className="text-gray-400">
                                    • Estancia: {h.durationLabel}
                                  </span>
                                )}
                                {h.by && (
                                  <span className="text-gray-400">
                                    • Por: {h.by}
                                  </span>
                                )}
                              </div>
                              {h.note && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {h.note}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="worklogs">
                <Table
                  headers={["Fecha", "Por", "Min", "Nota"]}
                  rows={(data.worklogs || []).map((w) => [
                    fmt(w.at),
                    w.by || "-",
                    w.minutes ?? "-",
                    w.note || "-",
                  ])}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
