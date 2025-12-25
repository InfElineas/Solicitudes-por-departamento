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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CHANNEL_OPTIONS = [
  "Sistema",
  "Google Sheets",
  "Correo Electrónico",
  "WhatsApp",
];
const TYPE_OPTIONS = ["Soporte", "Mejora", "Desarrollo", "Capacitación"];

function toISOorEmpty(v) {
  if (!v || !String(v).trim()) return "";
  // v viene de <input type="datetime-local"> (ej: "2025-10-21T14:30")
  // Lo convertimos a ISO con zona local -> UTC .toISOString()
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return d.toISOString();
  } catch {
    return "";
  }
}

const EditRequestDialog = ({
  open,
  onOpenChange,
  requestId,
  editData,
  setEditData,
  updateRequest,
  saving = false,
  typeOptions = TYPE_OPTIONS,
  channelOptions = CHANNEL_OPTIONS,
  departmentOptions = [],
}) => {
  if (!open) return null;

  const set = (patch) => setEditData((prev) => ({ ...prev, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!requestId) return;

    // --- Saneamos tipos y campos ---
    const payload = {
      // strings
      title: (editData.title || "").trim(),
      description: (editData.description || "").trim(),
      type: editData.type || undefined,
      channel: editData.channel || undefined,
      department: editData.department || undefined,
      priority: editData.priority || undefined,
    };

    // números
    if (editData.level !== "" && editData.level != null)
      payload.level = Number(editData.level);
    if (editData.assigned_to !== "" && editData.assigned_to != null)
      payload.assigned_to = Number(editData.assigned_to);
    if (editData.estimated_hours !== "" && editData.estimated_hours != null) {
      payload.estimated_hours = Number(editData.estimated_hours);
    }

    // fecha ISO (si viene)
    const iso = toISOorEmpty(editData.estimated_due);
    if (iso) payload.estimated_due = iso;

    // Disparamos el update pasando payload ya limpio
    updateRequest(requestId, payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Editar Solicitud</DialogTitle>
          <DialogDescription>
            Modifica los campos y guarda los cambios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={editData.title ?? ""}
              onChange={(e) => set({ title: e.target.value })}
              required
              disabled={saving}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={editData.description ?? ""}
              onChange={(e) => set({ description: e.target.value })}
              rows={4}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={editData.type || ""}
                onValueChange={(v) => set({ type: v })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Canal</Label>
              <Select
                value={editData.channel || ""}
                onValueChange={(v) => set({ channel: v })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {channelOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {departmentOptions.length > 0 && (
              <div className="space-y-1 md:col-span-2">
                <Label>Departamento</Label>
                <Select
                  value={editData.department || ""}
                  onValueChange={(v) => set({ department: v })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Nivel</Label>
              <Select
                value={String(editData.level ?? "")}
                onValueChange={(v) => set({ level: v })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (simple/capacitación)</SelectItem>
                  <SelectItem value="2">2 (soporte/correcciones)</SelectItem>
                  <SelectItem value="3">
                    3 (desarrollo/automatización)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Horas estimadas</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={editData.estimated_hours ?? ""}
                onChange={(e) => set({ estimated_hours: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Fecha compromiso (opcional)</Label>
              <Input
                type="datetime-local"
                value={editData.estimated_due || ""}
                onChange={(e) => set({ estimated_due: e.target.value })}
                disabled={saving}
              />
            </div>
          </div>

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
