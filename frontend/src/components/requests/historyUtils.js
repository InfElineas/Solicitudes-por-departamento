const STATUS_LABELS = {
  pending: "Pendiente",
  pendiente: "Pendiente",
  pendientes: "Pendiente",
  requested: "Solicitado",
  solicitado: "Solicitado",
  created: "Creado",
  creado: "Creado",
  assigned: "Asignado",
  asignado: "Asignado",
  in_progress: "En progreso",
  inprogress: "En progreso",
  "en progreso": "En progreso",
  progress: "En progreso",
  in_review: "En revisión",
  inreview: "En revisión",
  "en revisión": "En revisión",
  finished: "Finalizada",
  finalizada: "Finalizada",
  finalizado: "Finalizada",
  closed: "Cerrada",
  cerrada: "Cerrada",
  rejected: "Rechazada",
  rechazada: "Rechazada",
};

const parseDate = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const formatDuration = (ms) => {
  if (!ms || ms < 0) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h`;
};

const normalizeStatus = (raw) =>
  STATUS_LABELS[
    String(raw || "")
      .trim()
      .toLowerCase()
  ] || raw;

export const deriveHistory = (data) => {
  const baseHistory = Array.isArray(data?.history) ? data.history : [];
  const timeline = [];

  // Inicial: combinamos solicitado/creado en un solo hito
  const createdAt = parseDate(data?.created_at);
  const requestedAt = parseDate(data?.requested_at);
  const initial = [createdAt, requestedAt]
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (initial) {
    timeline.push({
      at: initial.toISOString(),
      from: null,
      to: "Creado / Solicitado",
    });
  }

  // Mapa de estados proveniente del backend
  const statusMap =
    data && typeof data === "object" && !Array.isArray(data)
      ? data.status_history || data.status_timestamps || data.status_dates
      : null;

  if (statusMap && typeof statusMap === "object") {
    Object.entries(statusMap).forEach(([status, at]) => {
      const parsed = parseDate(at);
      if (parsed)
        timeline.push({
          at: parsed.toISOString(),
          from: null,
          to: normalizeStatus(status),
        });
    });
  }

  // Timestamps directos
  const knownTimestampKeys = [
    { key: "assigned_at", label: "Asignado" },
    { key: "in_progress_at", label: "En progreso" },
    { key: "in_review_at", label: "En revisión" },
    { key: "finished_at", label: "Finalizada" },
    { key: "rejected_at", label: "Rechazada" },
    { key: "closed_at", label: "Cerrada" },
  ];

  knownTimestampKeys.forEach(({ key, label }) => {
    const parsed = parseDate(data?.[key]);
    if (parsed)
      timeline.push({ at: parsed.toISOString(), from: null, to: label });
  });

  // Historial explícito { from, to, at }
  baseHistory.forEach((entry) => {
    if (!entry) return;
    const parsed = parseDate(entry.at);
    if (parsed || entry.to) {
      timeline.push({
        ...entry,
        at: parsed ? parsed.toISOString() : undefined,
        to: normalizeStatus(entry.to),
        from: normalizeStatus(entry.from),
      });
    }
  });

  const ordered = timeline
    .filter((entry) => entry && (entry.at || entry.to))
    .sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));

  // Calcular duración en cada estado (entre este hito y el siguiente)
  return ordered.map((entry, idx) => {
    const currentDate = parseDate(entry.at);
    const nextDate = parseDate(ordered[idx + 1]?.at);
    const durationMs =
      currentDate && nextDate
        ? nextDate.getTime() - currentDate.getTime()
        : null;
    return {
      ...entry,
      durationMs,
      durationLabel: formatDuration(durationMs),
    };
  });
};
