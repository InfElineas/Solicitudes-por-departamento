// src/components/requests/AssignDialog.jsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const AssignDialog = ({
  open,
  onClose,
  onSubmit,
  assignData,
  setAssignData,
  users = [],
}) => {
  // ✅ Filtrar usuarios de soporte y del departamento "Informática"
  const supportUsers = users.filter(
    (u) =>
      (u.role === 'support' || u.role === 'admin') &&
      u.department === 'Informática'
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar responsable</DialogTitle>
          <DialogDescription>
            Solo puedes asignar a técnicos del departamento de Informática
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Técnico</Label>
            <Select
              value={assignData.assigned_to}
              onValueChange={(v) => setAssignData({ ...assignData, assigned_to: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {supportUsers.length > 0 ? (
                  supportUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-500">Sin técnicos disponibles</div>
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
              placeholder="Ej: 4"
              value={assignData.estimated_hours}
              onChange={(e) =>
                setAssignData({ ...assignData, estimated_hours: e.target.value })
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Fecha compromiso (opcional)</Label>
            <Input
              type="datetime-local"
              value={assignData.estimated_due}
              onChange={(e) =>
                setAssignData({ ...assignData, estimated_due: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!assignData.assigned_to}
          >
            Asignar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDialog;
