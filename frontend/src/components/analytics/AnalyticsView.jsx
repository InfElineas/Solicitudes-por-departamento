// src/components/analytics/AnalyticsView.jsx
import React from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '../ui/card';
import { FileText, Clock, CheckCircle, TrendingUp, Settings2, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

function AnalyticsView({ analytics, analyticsPeriod, setAnalyticsPeriod }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Análisis y Métricas</h2>
        <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Último día</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {analytics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard icon={<FileText className="h-4 w-4 text-muted-foreground" />} label="Total de solicitudes" value={analytics.totals?.total_requests ?? 0} sub="Acumulado" />
            <SummaryCard icon={<Clock className="h-4 w-4 text-muted-foreground" />} label="Nuevas (<24h)" value={analytics.totals?.new_last_24h ?? 0} sub="Últimas 24 horas" />
            <SummaryCard icon={<CheckCircle className="h-4 w-4 text-green-600" />} label="Finalizadas" value={analytics.finished} sub="Cerradas en el periodo" valueClass="text-green-600" />
            <SummaryCard icon={<Clock className="h-4 w-4 text-blue-600" />} label="Pendientes ahora" value={analytics.pending_now} valueClass="text-blue-600" />
            <SummaryCard icon={<UserPlus className="h-4 w-4 text-muted-foreground" />} label="Solicitudes asignadas" value={analytics.totals?.assigned_total ?? 0} sub="Actualmente" />
            <SummaryCard icon={<Settings2 className="h-4 w-4 text-muted-foreground" />} label="Sin asignar" value={analytics.totals?.unassigned_total ?? 0} sub="Actualmente" />
            <SummaryCard icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} label="Tiempo Promedio" value={`${analytics.avg_cycle_hours}h`} sub="Ciclo de creación → cierre" />
          </div>

          {/* Productividad por técnico */}
          <Card>
            <CardHeader>
              <CardTitle>Productividad por técnico</CardTitle>
              <CardDescription>
                Asignadas (acumulado), Atendidas (finalizadas en el periodo) y Pendientes (estado actual)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(analytics.productivity_by_tech?.length > 0) ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-600">
                      <tr>
                        <th className="py-2 pr-2">Técnico</th>
                        <th className="py-2 pr-2 text-right">Asignadas</th>
                        <th className="py-2 pr-2 text-right">Atendidas (periodo)</th>
                        <th className="py-2 pr-2 text-right">Pendientes</th>
                        <th className="py-2 pr-2 text-right">En revision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.productivity_by_tech.map((row) => (
                        <tr key={row.user_id}>
                          <td className="py-2 pr-2">{row.name || 'Sin asignación'}</td>
                          <td className="py-2 pr-2 text-right">{row.assigned_total ?? 0}</td>
                          <td className="py-2 pr-2 text-right">{row.attended_period ?? 0}</td>
                          <td className="py-2 pr-2 text-right">{row.pending_now ?? 0}</td>
                          <td className="py-2 pr-2 text-right">{row.in_revision ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sin datos en el periodo seleccionado.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, valueClass = '' }) {
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
