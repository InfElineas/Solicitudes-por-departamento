import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Props:
 * - open, onOpenChange, requestId, editData, setEditData, updateRequest
 * - saving?: boolean        (opcional; deshabilita UI mientras guarda)
 * - typeOptions?: string[]  (opcional; si vienen, usa <select>)
 * - channelOptions?: string[] (opcional)
 * - departmentOptions?: string[] (opcional)
 */
const EditRequestDialog = ({
  open,
  onOpenChange,
  requestId,
  editData,
  setEditData,
  updateRequest,
  saving = false,
  typeOptions = [],
  channelOptions = [],
  departmentOptions = [],
}) => {
  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!requestId) return;
    updateRequest(requestId);
  };

  const SelectOrInput = ({ id, name, label, value, onChange, options }) => {
    const hasOptions = Array.isArray(options) && options.length > 0;
    return (
      <div>
        <Label htmlFor={id}>{label}</Label>
        {hasOptions ? (
          <select
            id={id}
            name={name}
            value={value ?? ""}
            onChange={onChange}
            disabled={saving}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">— Seleccionar —</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={id}
            name={name}
            value={value ?? ""}
            onChange={onChange}
            disabled={saving}
          />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Editar Solicitud</DialogTitle>
          <DialogDescription>
            Modifica los campos de la solicitud y guarda los cambios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              value={editData.title ?? ""}
              onChange={handleChange}
              required
              disabled={saving}
            />
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              value={editData.description ?? ""}
              onChange={handleChange}
              rows={4}
              disabled={saving}
            />
          </div>

          {/* Tipo */}
          <SelectOrInput
            id="type"
            name="type"
            label="Tipo"
            value={editData.type}
            onChange={handleChange}
            options={typeOptions}
          />

          {/* Canal */}
          <SelectOrInput
            id="channel"
            name="channel"
            label="Canal"
            value={editData.channel}
            onChange={handleChange}
            options={channelOptions}
          />

          {/* Departamento */}
          <SelectOrInput
            id="department"
            name="department"
            label="Departamento"
            value={editData.department}
            onChange={handleChange}
            options={departmentOptions}
          />

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRequestDialog;
