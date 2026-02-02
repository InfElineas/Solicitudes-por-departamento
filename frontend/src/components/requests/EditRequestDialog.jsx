// EditRequestDialog.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
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
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return d.toISOString();
  } catch {
    return "";
  }
}
function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

const EditRequestDialog = ({
  open,
  onOpenChange,
  requestId,
  editData,
  updateRequest,
  saving = false,
  typeOptions = TYPE_OPTIONS,
  channelOptions = CHANNEL_OPTIONS,
  departmentOptions = [],
}) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "",
    channel: "",
    department: "",
    priority: "",
    level: "",
    assigned_to: "",
    estimated_hours: "",
    estimated_due: "",
  });

  const lastInitIdRef = useRef(null);

  // Inicializar form SOLO cuando open=true y cambie requestId
  useEffect(() => {
    if (!open) return;
    if (!requestId) return;
    if (lastInitIdRef.current === requestId) return;

    const normalized = {
      title: (editData?.title ?? "") + "",
      description: (editData?.description ?? "") + "",
      type: editData?.type ?? "",
      channel: editData?.channel ?? "",
      department: editData?.department ?? "",
      priority: editData?.priority ?? "",
      level: editData?.level != null ? String(editData.level) : "",
      assigned_to:
        editData?.assigned_to != null ? String(editData.assigned_to) : "",
      estimated_hours:
        editData?.estimated_hours != null
          ? String(editData.estimated_hours)
          : "",
      estimated_due:
        (editData?.estimated_due && String(editData.estimated_due).includes("T")
          ? editData.estimated_due
          : isoToLocalInput(editData?.estimated_due)) || "",
    };

    setForm(normalized);
    lastInitIdRef.current = requestId;
  }, [open, requestId]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  // localDepartments: incluir fallback si el valor actual no está en departmentOptions
  const localDepartments = useMemo(() => {
    const opts = Array.isArray(departmentOptions)
      ? departmentOptions.slice()
      : [];
    if (!form?.department) return opts;
    const matches = opts.some(
      (d) =>
        String(d.name) === String(form.department) ||
        String(d.id) === String(form.department),
    );
    if (matches) return opts;
    return [{ id: "__fallback_dept", name: String(form.department) }, ...opts];
  }, [departmentOptions, form.department]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!requestId) return;

    const payload = {};
    const put = (k, v) => {
      if (v !== "" && v !== undefined && v !== null) payload[k] = v;
    };

    put("title", (form.title || "").trim());
    put("description", (form.description || "").trim());
    put("type", form.type || undefined);
    put("channel", form.channel || undefined);

    // department: enviamos el nombre (mantener compatibilidad)
    if (form.department) {
      const found = (departmentOptions || []).find(
        (d) =>
          String(d.id) === String(form.department) ||
          String(d.name) === String(form.department),
      );
      if (found) put("department", found.name);
      else put("department", String(form.department));
    }

    put("priority", form.priority || undefined);
    if (form.level !== "" && form.level != null)
      put("level", Number(form.level));
    if (form.assigned_to !== "" && form.assigned_to != null)
      put("assigned_to", form.assigned_to);
    if (form.estimated_hours !== "" && form.estimated_hours != null)
      put("estimated_hours", Number(form.estimated_hours));

    const iso = toISOorEmpty(form.estimated_due);
    if (iso) put("estimated_due", iso);

    updateRequest(requestId, payload);
  };

  if (!open) return null;

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
              value={form.title ?? ""}
              onChange={(e) => set({ title: e.target.value })}
              required
              disabled={saving}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={form.description ?? ""}
              onChange={(e) => set({ description: e.target.value })}
              rows={4}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={form.type || ""}
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
                value={form.channel || ""}
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

            <div className="space-y-1 md:col-span-2">
              <Label>Departamento</Label>
              <Select
                value={form.department || ""}
                onValueChange={(v) => set({ department: v })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {localDepartments.map((o) => (
                    <SelectItem
                      key={o.id ?? o.name}
                      value={o.name ?? String(o.id)}
                    >
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Nivel</Label>
              <Select
                value={String(form.level ?? "")}
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
                value={form.estimated_hours ?? ""}
                onChange={(e) => set({ estimated_hours: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Fecha compromiso (opcional)</Label>
              <Input
                type="datetime-local"
                value={form.estimated_due || ""}
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
