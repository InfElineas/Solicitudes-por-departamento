import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Filter,
  Flag,
  Layers,
  ListOrdered,
  MessageSquare,
  Search,
  Tag,
  Users,
  UserCircle2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Props:
 * - filters: {
 *     q, status, department, type, level, channel, sort,
 *     created_by,  // 'all' o id (string/number)
 *     assigned_by, // 'all' o id (string/number)
 *     assigned_to, // 'all' o id (string/number)
 *   }
 * - setFilters: (f) => void
 * - departments: string[]
 * - setPage: (n) => void
 * - users: Array<{ id: number|string, full_name: string, role?: string, department?: string }>
 */
const RequestFilters = ({
  filters,
  setFilters,
  departments,
  setPage,
  users = [],
  user,
}) => {
  const handleChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setPage(1); // reset paginación al cambiar filtros
  };

  // Opciones para "Asignado por/Asignado a": todos los usuarios disponibles
  const assignerOptions = users;
  const assigneeOptions = users.filter((u) => u.role === "support");

  const userLabel = (u) => u?.full_name || u?.username || `Usuario ${u?.id}`;

  return (
    <div className="bg-white border rounded-xl p-3 sm:p-4 space-y-4">
      {/* Buscar */}
      <div>
        <Label className="text-xs uppercase tracking-wide text-slate-500">
          Buscar
        </Label>
        <div className="relative mt-2">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por título o descripción..."
            value={filters.q}
            onChange={(e) => handleChange("q", e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Estado */}
        <div>
          <Label className="sr-only md:not-sr-only text-xs text-slate-500">
            Estado
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleChange("status", value)}
          >
            <SelectTrigger className="h-9 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Estado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
              <SelectItem value="En progreso">En progreso</SelectItem>
              <SelectItem value="En revisión">En revisión</SelectItem>
              <SelectItem value="Finalizada">Finalizada</SelectItem>
              <SelectItem value="Rechazada">Rechazada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Departamento */}
        <div>
          <Label className="sr-only md:not-sr-only text-xs text-slate-500">
            Departamento
          </Label>
          <Select
            value={filters.department}
            onValueChange={(value) => handleChange("department", value)}
          >
            <SelectTrigger className="h-9 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Depto." />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={d.name}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        <div>
          <Label className="sr-only md:not-sr-only text-xs text-slate-500">
            Tipo
          </Label>
          <Select
            value={filters.type}
            onValueChange={(value) => handleChange("type", value)}
          >
            <SelectTrigger className="h-9 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Tipo" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Soporte">Soporte</SelectItem>
              <SelectItem value="Mejora">Mejora</SelectItem>
              <SelectItem value="Desarrollo">Desarrollo</SelectItem>
              <SelectItem value="Capacitación">Capacitación</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Nivel */}
        <div>
          <Label className="sr-only md:not-sr-only text-xs text-slate-500">
            Nivel
          </Label>
          <Select
            value={filters.level}
            onValueChange={(value) => handleChange("level", value)}
          >
            <SelectTrigger className="h-9 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Nivel" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="1">1 (simple/capacitación)</SelectItem>
              <SelectItem value="2">2 (soporte/correcciones)</SelectItem>
              <SelectItem value="3">3 (desarrollo/automatización)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Canal */}
        <div>
          <Label className="sr-only md:not-sr-only text-xs text-slate-500">
            Canal
          </Label>
          <Select
            value={filters.channel}
            onValueChange={(value) => handleChange("channel", value)}
          >
            <SelectTrigger className="h-9 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Canal" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Sistema">Sistema</SelectItem>
              <SelectItem value="Google Sheets">Google Sheets</SelectItem>
              <SelectItem value="Correo Electrónico">
                Correo Electrónico
              </SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Asignado a */}
        <div className="md:col-span-1">
          <Label className="sr-only md:not-sr-only text-xs text-slate-500">
            Asignado a
          </Label>
          <Select
            value={filters.assigned_to}
            onValueChange={(value) => handleChange("assigned_to", value)}
          >
            <SelectTrigger className="h-9 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Asignado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {assigneeOptions.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {userLabel(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Solicitado por */}
        <div className="md:col-span-1">
          <Label className="sr-only md:not-sr-only text-xs text-slate-500">
            Solicitado por
          </Label>
          <Select
            value={filters.requester_id}
            onValueChange={(value) => handleChange("requester_id", value)}
          >
            <SelectTrigger className="h-9 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <UserCircle2 className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Solicitante" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {assignerOptions.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {userLabel(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orden */}
        <div className="md:col-span-2 lg:col-span-3">
          <Label className="sr-only md:not-sr-only text-xs text-slate-500">
            Orden
          </Label>
          <Select
            value={filters.sort}
            onValueChange={(value) => handleChange("sort", value)}
          >
            <SelectTrigger className="h-9 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Orden" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-created_at">
                Creación: más recientes
              </SelectItem>
              <SelectItem value="created_at">Creación: más antiguas</SelectItem>
              <SelectItem value="-requested_at">
                Solicitada: más recientes
              </SelectItem>
              <SelectItem value="requested_at">
                Solicitada: más antiguas
              </SelectItem>
              <SelectItem value="status">
                Estado (Pendiente→Rechazada)
              </SelectItem>
              <SelectItem value="-status">
                Estado (Rechazada→Pendiente)
              </SelectItem>
              <SelectItem value="department">Departamento (A→Z)</SelectItem>
              <SelectItem value="-department">Departamento (Z→A)</SelectItem>
              <SelectItem value="-priority">Prioridad (Alta→Baja)</SelectItem>
              <SelectItem value="priority">Prioridad (Baja→Alta)</SelectItem>
              <SelectItem value="level">Nivel (1→3)</SelectItem>
              <SelectItem value="-level">Nivel (3→1)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default RequestFilters;
