import { useMemo } from "react";
import { startOfDay, subDays, subMonths, subWeeks } from "date-fns";

// Normaliza llaves de estado que llegan desde el backend para agruparlas en las
// columnas del dashboard. Se soportan mayúsculas/minúsculas y variantes en
// español/inglés para no depender de un único formato.
const STATUS_KEYS = {
  pendiente: "pending",
  pending: "pending",
  pending_now: "pending",
  pendientes: "pending",
  "in progress": "inProgress",
  in_progress: "inProgress",
  inprogress: "inProgress",
  "en progreso": "inProgress",
  progreso: "inProgress",
  progress: "inProgress",
  inreview: "inReview",
  in_review: "inReview",
  revision: "inReview",
  review: "inReview",
  "en revisión": "inReview",
  "en revision": "inReview",
  revisado: "inReview",
  finalizada: "finished",
  finalizadas: "finished",
  finalizado: "finished",
  finished: "finished",
  done: "finished",
  completada: "finished",
  completadas: "finished",
};

export const buildPeriodParams = (period = "all", now = new Date()) => {
  const params = new URLSearchParams();
  const today = startOfDay(now);
  if (period === "day") {
    params.set("period", "daily");
    params.set("start_date", subDays(today, 1).toISOString());
    params.set("end_date", today.toISOString());
  } else if (period === "week") {
    params.set("period", "weekly");
    params.set("start_date", subWeeks(today, 1).toISOString());
    params.set("end_date", today.toISOString());
  } else if (period === "month") {
    params.set("period", "monthly");
    params.set("start_date", subMonths(today, 1).toISOString());
    params.set("end_date", today.toISOString());
  } else {
    params.set("range", "all");
  }
  return params;
};

export const pickProductivityRows = (analytics = {}, period = "all") => {
  const candidates = [];

  try {
    if (period === "all") {
      candidates.push(
        analytics.all_time_productivity,
        analytics.productivity_all,
        analytics.productivity_total,
        analytics.all_productivity,
      );
    }
    candidates.push(analytics.productivity_by_tech, analytics.productivity);
  } catch (error) {
    console.error(error);
  }

  const dataset = candidates.find(
    (arr) => Array.isArray(arr) && arr.length > 0,
  );
  return dataset || [];
};

const coalesce = (...values) =>
  values.find((v) => Number.isFinite(Number(v))) ?? 0;

const normalizeStatusKey = (key) => {
  if (!key) return null;
  const normalized = String(key).trim().toLowerCase();
  if (STATUS_KEYS[normalized]) return STATUS_KEYS[normalized];
  return null;
};

const extractStatusBreakdown = (row) => {
  const sources = [
    row?.status_breakdown,
    row?.statuses,
    row?.status_counts,
    row?.status_count_by_state,
  ].find((m) => m && typeof m === "object");
  if (!sources) return {};

  return Object.entries(sources).reduce((acc, [key, raw]) => {
    const mapped = normalizeStatusKey(key);
    if (!mapped) return acc;
    const asNumber = Number(raw) || 0;
    acc[mapped] = (acc[mapped] || 0) + asNumber;
    return acc;
  }, {});
};

export const normalizeProductivityRows = (rows = []) => {
  return rows.map((row) => {
    const statusCounts = extractStatusBreakdown(row);
    const hasStatusBreakdown = Object.keys(statusCounts).length > 0;

    const pending = coalesce(
      statusCounts.pending,
      row?.pending_now,
      row?.pending,
    );
    const inProgress = coalesce(
      statusCounts.inProgress,
      row?.in_progress,
      row?.progress,
    );
    const inReview = coalesce(
      statusCounts.inReview,
      row?.in_review,
      row?.review,
    );
    const finished = coalesce(
      statusCounts.finished,
      row?.attended_period,
      row?.finished,
      row?.finalizadas,
    );

    const statusTotal = pending + inProgress + inReview + finished;
    const assigned = hasStatusBreakdown
      ? statusTotal
      : coalesce(
          row?.assigned_period,
          row?.assigned,
          row?.total_assigned,
          row?.assigned_total,
          row?.total,
          row?.count,
          statusTotal,
        );

    return {
      user_id:
        row?.user_id ??
        row?.id ??
        row?.user ??
        row?.username ??
        row?.name ??
        "unknown",
      name: row?.name || row?.full_name || row?.username || "Sin nombre",
      department:
        row?.department ||
        row?.department_name ||
        row?.dept ||
        row?.area ||
        "Sin departamento",
      assigned,
      inProgress,
      inReview,
      finished,
      pending,
    };
  });
};

export const buildRanking = (rows = []) => {
  const sorted = [...rows].sort((a, b) => {
    const finishedA = Number(a.finished) || 0;
    const finishedB = Number(b.finished) || 0;
    if (finishedA !== finishedB) return finishedB - finishedA;
    const assignedA = Number(a.assigned) || 0;
    const assignedB = Number(b.assigned) || 0;
    return assignedB - assignedA;
  });

  return sorted.map((row, index) => ({ ...row, position: index + 1 }));
};

export const filterProductivityRows = (rows, filters = {}) => {
  const tech = filters.technician || "all";
  const dept = filters.department || "all";
  // Los filtros se aplican en cliente sobre el dataset de productividad por
  // técnico para que tabla, tarjetas y gráficos compartan la misma fuente de datos.
  return rows.filter((row) => {
    const matchesTech = tech === "all" || String(row.user_id) === String(tech);
    const matchesDept =
      dept === "all" ||
      (row.department &&
        String(row.department).toLowerCase() === String(dept).toLowerCase());
    return matchesTech && matchesDept;
  });
};

export const computeGlobalMetrics = (rows = []) => {
  const totals = rows.reduce(
    (acc, row) => {
      acc.assigned += Number(row.assigned) || 0;
      acc.inProgress += Number(row.inProgress) || 0;
      acc.inReview += Number(row.inReview) || 0;
      acc.finished += Number(row.finished) || 0;
      acc.pending += Number(row.pending) || 0;
      return acc;
    },
    { assigned: 0, inProgress: 0, inReview: 0, finished: 0, pending: 0 },
  );

  const technicianCount = rows.length;
  const averagePerTech = technicianCount
    ? totals.assigned / technicianCount
    : 0;
  const averageFinishedPerTech = technicianCount
    ? totals.finished / technicianCount
    : 0;
  const active = totals.inProgress + totals.inReview + totals.pending;

  return {
    ...totals,
    active,
    technicianCount,
    averagePerTech,
    averageFinishedPerTech,
  };
};

export const useProductivity = (analytics, filters, period = "all") => {
  return useMemo(() => {
    const source = pickProductivityRows(analytics, period);
    const normalized = normalizeProductivityRows(source || []);
    const filtered = filterProductivityRows(normalized, filters);
    const global = computeGlobalMetrics(filtered);
    const ranking = buildRanking(filtered);
    return { normalized, filtered, global, ranking };
  }, [analytics, filters, period]);
};
