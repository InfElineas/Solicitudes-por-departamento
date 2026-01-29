// src/components/departments/DepartmentsView.jsx

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";

function DepartmentsView({ departments, users }) {
  console.log("DepartmentsView departments:", departments);
  if (Array.isArray(departments)) {
    console.log("First department:", departments[0]);
    console.log(
      "Type of name:",
      typeof departments[0]?.name,
      departments[0]?.name,
    );
  }
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Departamentos</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {departments && Array.isArray(departments) ? (
          departments?.map((dept) => {
            const userCount = Array.isArray(users)
              ? users.filter((u) => u.department === dept.name).length
              : 0;
            const requestCount = dept.total || 0;

            return (
              <Card
                key={dept.id}
                className="w-full max-w-[20rem] sm:max-w-none mx-auto"
              >
                <CardHeader>
                  <CardTitle className="text-lg">
                    {typeof dept.name === "string"
                      ? dept.name
                      : dept.name?.name || "Sin nombre"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      👥 Usuarios activos: <strong>{userCount}</strong>
                    </p>
                    <p>
                      📄 Solicitudes: <strong>{requestCount}</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-12 bg-white rounded-lg border xl:col-span-2">
            Cargando departamentos...
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Solicitudes por Departamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {departments ? (
              departments.map((row) => (
                <StackedBar
                  key={row.id || row.name}
                  row={row}
                  max={departments.reduce(
                    (max, r) => Math.max(max, r.total),
                    0,
                  )}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500">Sin datos para graficar.</p>
            )}
            {departments && (
              <div className="flex flex-wrap gap-3 text-xs text-gray-600 pt-2">
                <LegendDot color="bg-blue-500" label="Abiertas" />
                <LegendDot color="bg-green-500" label="Cerradas" />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              Tiempo promedio de resolución de solicitud por departamento
            </CardTitle>
            <CardDescription>
              Total de departamentos: {departments?.length || 0}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {departments ? (
              departments.map((row) => (
                <BlackBar
                  key={row.department}
                  row={row}
                  max={departments.reduce(
                    (max, r) => Math.max(max, r.avg_resolution_time),
                    0,
                  )}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500">Sin datos disponibles.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const StackedBar = ({ row, max = 0 }) => {
  const segments = [
    { key: "open", label: "Abiertas", color: "bg-blue-500" },
    { key: "completed", label: "Cerradas", color: "bg-green-500" },
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
          {typeof row.name === "string"
            ? row.name
            : row.name?.name || "Sin nombre"}
        </span>
        <span className="font-medium text-gray-900">{total}</span>
      </div>
      <div className="h-3 rounded bg-gray-100 overflow-hidden flex">
        {segments.map((seg) => {
          const value = Number(row[seg.key]) || "0";
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

const BlackBar = ({ row, max = 0 }) => {
  const segments = [
    {
      key: "avg_resolution_time",
      label: "Tiempo de resolución promedio",
      color: "bg-slate-500",
    },
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
          {typeof row.name === "string"
            ? row.name
            : row.name?.name || "Sin nombre"}
        </span>
        <span className="font-medium text-gray-900">
          {total ? total + "h" : "N/A"}
        </span>
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
              title={`${seg.label}: ${value + "h"}`}
            />
          );
        })}
      </div>
    </div>
  );
};

const LegendDot = ({ color, label }) => (
  <span className="flex items-center gap-2">
    <span className={`h-3 w-3 rounded-sm ${color}`} />
    <span>{label}</span>
  </span>
);

export default DepartmentsView;
