// src/components/analytics/AnalyticsView.jsx
import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import {
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  Settings2,
  UserPlus,
  Users,
  BarChart3,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useProductivity } from "./analyticsUtils";

function AnalyticsView({
  analytics,
  analyticsPeriod,
  setAnalyticsPeriod,
  analyticsFilters,
  setAnalyticsFilters,
  users = [],
  departments = [],
}) {
  const { filtered, global, ranking } = useProductivity(
    analytics,
    analyticsFilters,
    analyticsPeriod,
  );

  const maxFinished = useMemo(
    () => Math.max(...filtered.map((row) => Number(row.finished) || 0), 0),
    [filtered],
  );
  const maxTotal = useMemo(
    () => Math.max(...filtered.map((row) => Number(row.assigned) || 0), 0),
    [filtered],
  );

  const technicianOptions =
    users.length > 0 ? users : analytics?.productivity || [];

  const handleFilterChange = (key, value) => {
    setAnalyticsFilters((prev) => ({ ...prev, [key]: value }));
  };

  const noData = !analytics || filtered.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Análisis y Métricas
        </h2>
        <div className="flex flex-wrap items-center gap-3 max-md:w-full">
          <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
            <SelectTrigger className="w-48 max-md:w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tiempos</SelectItem>
              <SelectItem value="day">Último día</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={analyticsFilters?.technician || "all"}
            onValueChange={(value) => handleFilterChange("technician", value)}
          >
            <SelectTrigger className="w-48 max-md:w-full">
              <SelectValue placeholder="Técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los técnicos</SelectItem>
              {technicianOptions.map((tech) => (
                <SelectItem
                  key={tech.id || tech.user_id || tech.username || tech.name}
                  value={String(
                    tech.id || tech.user_id || tech.username || tech.name,
                  )}
                >
                  {tech.full_name || tech.name || tech.username || "Sin nombre"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* <Select
            value={analyticsFilters?.department || "all"}
            onValueChange={(value) => handleFilterChange("department", value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select> */}
        </div>
      </div>

      {!analytics && (
        <p className="text-sm text-gray-500">Cargando métricas...</p>
      )}

      {analytics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              label="Total de solicitudes"
              value={global.assigned}
              sub="Asignadas en el periodo"
            />
            <SummaryCard
              icon={<CheckCircle className="h-4 w-4 text-green-600" />}
              label="Finalizadas"
              value={global.finished}
              sub="Cerradas"
              valueClass="text-green-600"
            />
            <SummaryCard
              icon={<Clock className="h-4 w-4 text-sky-600" />}
              label="En proceso"
              value={global.inProgress}
              valueClass="text-sky-600"
            />
            <SummaryCard
              icon={<TrendingUp className="h-4 w-4 text-indigo-600" />}
              label="En revisión"
              value={global.inReview}
              valueClass="text-indigo-600"
            />
            <SummaryCard
              icon={<Settings2 className="h-4 w-4 text-orange-600" />}
              label="Pendientes"
              value={global.pending}
              valueClass="text-orange-600"
            />
            <SummaryCard
              icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
              label="Promedio por técnico"
              value={global.averagePerTech.toFixed(1)}
              sub="Asignadas"
            />
            <SummaryCard
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              label="Técnicos activos"
              value={global.technicianCount}
              sub="Con datos en el periodo"
            />
            <SummaryCard
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
              label="Finalizadas por técnico"
              value={global.averageFinishedPerTech.toFixed(1)}
              sub="Promedio"
            />
          </div>

          {/* Productividad por técnico */}
          <Card>
            <CardHeader>
              <CardTitle>Productividad por técnico</CardTitle>
              <CardDescription>
                Distribución de estados para cada técnico según filtros y
                periodo seleccionado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!noData ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-600">
                      <tr>
                        <th className="py-2 pr-2">Técnico</th>
                        <th className="py-2 pr-2 text-right">Asignadas</th>
                        <th className="py-2 pr-2 text-right">En proceso</th>
                        <th className="py-2 pr-2 text-right">En revisión</th>
                        <th className="py-2 pr-2 text-right">Finalizadas</th>
                        <th className="py-2 pr-2 text-right">Pendientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
                        <tr key={row.user_id}>
                          <td className="py-2 pr-2 whitespace-nowrap">
                            {row.name || "Sin asignación"}
                          </td>
                          <td className="py-2 pr-2 text-right">
                            {row.assigned ?? 0}
                          </td>
                          <td className="py-2 pr-2 text-right">
                            {row.inProgress ?? 0}
                          </td>
                          <td className="py-2 pr-2 text-right">
                            {row.inReview ?? 0}
                          </td>
                          <td className="py-2 pr-2 text-right">
                            {row.finished ?? 0}
                          </td>
                          <td className="py-2 pr-2 text-right">
                            {row.pending ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Sin datos en el periodo seleccionado.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Finalizadas por técnico</CardTitle>
                <CardDescription>
                  Comparativa de finalización por persona
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!noData ? (
                  filtered.map((row) => (
                    <BarItem
                      key={row.user_id}
                      label={row.name}
                      value={row.finished}
                      max={maxFinished}
                      colorClass="bg-green-500"
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    Sin datos para graficar.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por estado</CardTitle>
                <CardDescription>
                  Asignadas, en proceso, revisión y pendientes por técnico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!noData ? (
                  filtered.map((row) => (
                    <StackedBar key={row.user_id} row={row} max={maxTotal} />
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    Sin datos para graficar.
                  </p>
                )}
                {!noData && (
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600 pt-2">
                    <LegendDot color="bg-orange-500" label="Pendientes" />
                    <LegendDot color="bg-sky-500" label="En proceso" />
                    <LegendDot color="bg-indigo-500" label="En revisión" />
                    <LegendDot color="bg-green-500" label="Finalizadas" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ranking por técnico */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking de técnicos</CardTitle>
              <CardDescription>
                Ordenado por finalizadas y asignadas en el periodo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!noData ? (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-2">Posición</th>
                        <th className="py-2 pr-2">Técnico</th>
                        <th className="py-2 pr-2 text-right">Finalizadas</th>
                        <th className="py-2 pr-2 text-right">Asignadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((row) => (
                        <tr
                          key={row.user_id}
                          className="border-t border-gray-100"
                        >
                          <td className="py-2 pr-2 whitespace-nowrap font-medium">
                            #{row.position}
                          </td>
                          <td className="py-2 pr-2 whitespace-nowrap">
                            {row.name || "Sin asignación"}
                          </td>
                          <td className="py-2 pr-2 text-right">
                            {row.finished ?? 0}
                          </td>
                          <td className="py-2 pr-2 text-right">
                            {row.assigned ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Sin datos para mostrar ranking.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const LegendDot = ({ color, label }) => (
  <span className="flex items-center gap-2">
    <span className={`h-3 w-3 rounded-sm ${color}`} />
    <span>{label}</span>
  </span>
);

const BarItem = ({ label, value = 0, max = 0, colorClass }) => {
  const clampedMax = Math.max(max, value, 1);
  const percentage = Math.min(
    100,
    Math.max((value / clampedMax) * 100, value > 0 ? 6 : 0),
  );
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span className="truncate pr-2" title={label}>
          {label}
        </span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="h-2 rounded bg-gray-100 overflow-hidden">
        <div
          className={`h-2 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const StackedBar = ({ row, max = 0 }) => {
  const segments = [
    { key: "pending", label: "Pendientes", color: "bg-orange-500" },
    { key: "inProgress", label: "En proceso", color: "bg-sky-500" },
    { key: "inReview", label: "En revisión", color: "bg-indigo-500" },
    { key: "finished", label: "Finalizadas", color: "bg-green-500" },
  ];

  const total = segments.reduce(
    (acc, seg) => acc + (Number(row[seg.key]) || 0),
    0,
  );
  const divisor = Math.max(max, total, 1);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span className="truncate pr-2" title={row.name}>
          {row.name}
        </span>
        <span className="font-medium text-gray-900">{total}</span>
      </div>
      <div className="h-3 rounded bg-gray-100 overflow-hidden flex">
        {segments.map((seg) => {
          const value = Number(row[seg.key]) || 0;
          const width = Math.min(100, (value / divisor) * 100);
          return (
            <div
              key={seg.key}
              className={`${seg.color} h-full`}
              style={{ width: `${width}%` }}
              title={`${seg.label}: ${value}`}
            />
          );
        })}
      </div>
    </div>
  );
};

function SummaryCard({ icon, label, value, sub, valueClass = "" }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default AnalyticsView;
