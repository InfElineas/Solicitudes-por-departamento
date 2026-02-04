import React, { useState } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

// Enums unificados con App.js (VALID)
const CHANNEL_OPTIONS = [
  "Sistema",
  "Google Sheets",
  "Correo Electrónico",
  "WhatsApp",
];
const TYPE_OPTIONS = ["Soporte", "Mejora", "Desarrollo", "Capacitación"];

const CreateRequestDialog = ({
  user,
  users,
  newRequest,
  setNewRequest,
  createRequest,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin";

  // Técnicos disponibles (soporte/admin del depto Informática)
  const availableTechnicians = Array.isArray(users)
    ? users.filter(
        (u) =>
          (u.role === "support" || u.role === "admin") &&
          u.department === "Informática",
      )
    : [];

  // Sanea y envía payload correcto al backend
  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    // Armar payload (compatible con la lógica que ya tienes en el padre)
    const payload = {
      title: (newRequest.title || "").trim(),
      description: (newRequest.description || "").trim(),
      priority: newRequest.priority || "Media",
      type: newRequest.type || "Soporte",
      channel: newRequest.channel || "Sistema",
    };

    if (isAdmin) {
      if (newRequest.level) payload.level = Number(newRequest.level);
      if (newRequest.assigned_to) payload.assigned_to = newRequest.assigned_to;
      if (
        newRequest.estimated_hours !== "" &&
        newRequest.estimated_hours != null
      ) {
        payload.estimated_hours = Number(newRequest.estimated_hours);
      }
      if ((newRequest.estimated_due || "").trim()) {
        payload.estimated_due = newRequest.estimated_due;
      }
    }

    // Evitar reenvíos
    if (submitting) return;

    setSubmitting(true);
    try {
      // Llamamos al handler padre. Si tu createRequest acepta evento lo atrapará,
      // si acepta payload lo usará. Ambos funcionan con la implementación actual.
      await Promise.resolve(createRequest(payload));
      // Mostrar alerta de éxito breve y cordial
      await Swal.fire({
        icon: "success",
        title: "Solicitud creada",
        text: "Tu solicitud fue creada correctamente. ¡Gracias!",
        timer: 1300,
        showConfirmButton: false,
        position: "center",
      });
      // Nota: el padre (createRequest) debería resetear el formulario y cerrar el dialog
    } catch (err) {
      // Mostrar error amigable
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Error al crear la solicitud";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handler auxiliar para cambiar campos (inmutable)
  const setField = (patch) => setNewRequest({ ...newRequest, ...patch });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Crear Nueva Solicitud</DialogTitle>
        <DialogDescription>
          Completa los detalles de tu solicitud de automatización.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={newRequest.title || ""}
            onChange={(e) => setField({ title: e.target.value })}
            required
            disabled={submitting}
          />
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={newRequest.description || ""}
            onChange={(e) => setField({ description: e.target.value })}
            required
            rows={3}
            disabled={submitting}
          />
        </div>

        {/* Campos comunes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Prioridad</Label>
            <Select
              value={newRequest.priority || "Media"}
              onValueChange={(value) => setField({ priority: value })}
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de solicitud</Label>
            <Select
              value={newRequest.type || "Soporte"}
              onValueChange={(value) => setField({ type: value })}
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Canal de la solicitud</Label>
            <Select
              value={newRequest.channel || "Sistema"}
              onValueChange={(value) => setField({ channel: value })}
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Campos exclusivos para admin */}
        {isAdmin && (
          <>
            <div className="border-t pt-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Select
                  value={String(newRequest.level || "1")}
                  onValueChange={(v) => setField({ level: v })}
                  disabled={submitting}
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

              <div className="space-y-2">
                <Label>Técnico (opcional)</Label>
                <Select
                  value={newRequest.assigned_to || ""}
                  onValueChange={(v) => setField({ assigned_to: v })}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTechnicians.length > 0 ? (
                      availableTechnicians.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        Sin técnicos de Informática disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Horas estimadas</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newRequest.estimated_hours ?? ""}
                  onChange={(e) =>
                    setField({ estimated_hours: e.target.value })
                  }
                  placeholder="Ej: 4"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha compromiso (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={newRequest.estimated_due || ""}
                  onChange={(e) => setField({ estimated_due: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>
          </>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? "Creando solicitud…" : "Crear Solicitud"}
        </Button>
      </form>
    </DialogContent>
  );
};

export default CreateRequestDialog;
