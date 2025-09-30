// src/components/requests/CreateRequestDialog.jsx

import React from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const CreateRequestDialog = ({
  user,
  users,
  newRequest,
  setNewRequest,
  createRequest
}) => {
  const isAdmin = user?.role === 'admin';

  // ✅ Técnicos filtrados: soporte o admin y del depto Informática
  const availableTechnicians = users.filter(
    (u) =>
      (u.role === 'support' || u.role === 'admin') &&
      u.department === 'Informática'
  );

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Crear Nueva Solicitud</DialogTitle>
        <DialogDescription>
          Completa los detalles de tu solicitud de automatización.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={createRequest} className="space-y-4">
        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={newRequest.title}
            onChange={(e) =>
              setNewRequest({ ...newRequest, title: e.target.value })
            }
            required
          />
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={newRequest.description}
            onChange={(e) =>
              setNewRequest({ ...newRequest, description: e.target.value })
            }
            required
            rows={3}
          />
        </div>

        {/* Campos comunes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Prioridad</Label>
            <Select
              value={newRequest.priority}
              onValueChange={(value) =>
                setNewRequest({ ...newRequest, priority: value })
              }
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={newRequest.type}
              onValueChange={(value) =>
                setNewRequest({ ...newRequest, type: value })
              }
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Soporte">Soporte</SelectItem>
                <SelectItem value="Mejora">Mejora</SelectItem>
                <SelectItem value="Desarrollo">Desarrollo</SelectItem>
                <SelectItem value="Capacitación">Capacitación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Canal</Label>
            <Select
              value={newRequest.channel}
              onValueChange={(value) =>
                setNewRequest({ ...newRequest, channel: value })
              }
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sistema">Sistema</SelectItem>
                <SelectItem value="Correo">Correo</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
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
                  value={newRequest.level}
                  onValueChange={(v) => setNewRequest({ ...newRequest, level: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Técnico (opcional)</Label>
                <Select
                  value={newRequest.assigned_to}
                  onValueChange={(v) =>
                    setNewRequest({ ...newRequest, assigned_to: v })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {availableTechnicians.length > 0 ? (
                      availableTechnicians.map(u => (
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
                  value={newRequest.estimated_hours}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, estimated_hours: e.target.value })
                  }
                  placeholder="Ej: 4"
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha compromiso (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={newRequest.estimated_due}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, estimated_due: e.target.value })
                  }
                />
              </div>
            </div>
          </>
        )}

        <Button type="submit" className="w-full">
          Crear Solicitud
        </Button>
      </form>
    </DialogContent>
  );
};

export default CreateRequestDialog;
