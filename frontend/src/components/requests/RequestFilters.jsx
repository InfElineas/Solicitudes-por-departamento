import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RequestFilters = ({ filters, setFilters, departments, setPage }) => {
  const handleChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setPage(1); // reinicia a la primera página cuando cambia un filtro
  };

  return (
    <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-6 gap-4">
      {/* Buscar */}
      <div className="md:col-span-2">
        <Label className="text-sm">Buscar</Label>
        <Input
          placeholder="Título o descripción..."
          value={filters.q}
          onChange={(e) => handleChange("q", e.target.value)}
        />
      </div>

      {/* Estado */}
      <div>
        <Label className="text-sm">Estado</Label>
        <Select
          value={filters.status}
          onValueChange={(value) => handleChange("status", value)}
        >
          <SelectTrigger>
            <SelectValue />
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
        <Label className="text-sm">Departamento</Label>
        <Select
          value={filters.department}
          onValueChange={(value) => handleChange("department", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tipo */}
      <div>
        <Label className="text-sm">Tipo</Label>
        <Select
          value={filters.type}
          onValueChange={(value) => handleChange("type", value)}
        >
          <SelectTrigger>
            <SelectValue />
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
        <Label className="text-sm">Nivel</Label>
        <Select
          value={filters.level}
          onValueChange={(value) => handleChange("level", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Canal */}
      <div>
        <Label className="text-sm">Canal</Label>
        <Select
          value={filters.channel}
          onValueChange={(value) => handleChange("channel", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Sistema">Sistema</SelectItem>
            <SelectItem value="Correo">Correo</SelectItem>
            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orden */}
      <div className="md:col-span-2">
        <Label className="text-sm">Orden</Label>
        <Select
          value={filters.sort}
          onValueChange={(value) => handleChange("sort", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-created_at">Creación: más recientes</SelectItem>
            <SelectItem value="created_at">Creación: más antiguas</SelectItem>
            <SelectItem value="-requested_at">
              Solicitada: más recientes
            </SelectItem>
            <SelectItem value="requested_at">
              Solicitada: más antiguas
            </SelectItem>
            <SelectItem value="status">Estado (A→Z)</SelectItem>
            <SelectItem value="-status">Estado (Z→A)</SelectItem>
            <SelectItem value="department">Depto (A→Z)</SelectItem>
            <SelectItem value="-department">Depto (Z→A)</SelectItem>
            <SelectItem value="priority">Prioridad (A→Z)</SelectItem>
            <SelectItem value="-priority">Prioridad (Z→A)</SelectItem>
            <SelectItem value="level">Nivel (1→3)</SelectItem>
            <SelectItem value="-level">Nivel (3→1)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default RequestFilters;
