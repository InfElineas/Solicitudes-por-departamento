import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ClassifyDialog = ({
  classifyDialogFor,
  setClassifyDialogFor,
  classifyData,
  setClassifyData,
  classifyRequest,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setClassifyData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    classifyRequest(classifyDialogFor);
    setClassifyDialogFor(null);
  };

  return (
    <Dialog
      open={!!classifyDialogFor}
      onOpenChange={() => setClassifyDialogFor(null)}
    >
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Clasificar Solicitud</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nivel */}
          <div>
            <label className="block mb-1 text-sm font-medium">Nivel</label>
            <select
              name="level"
              value={classifyData.level || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Selecciona nivel</option>
              <option value="1">Nivel 1</option>
              <option value="2">Nivel 2</option>
              <option value="3">Nivel 3</option>
            </select>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block mb-1 text-sm font-medium">Prioridad</label>
            <select
              name="priority"
              value={classifyData.priority || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Selecciona prioridad</option>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Crítica">Crítica</option>
            </select>
          </div>

          {/* Comentario */}
          <div>
            <label className="block mb-1 text-sm font-medium">Comentario</label>
            <textarea
              name="comment"
              value={classifyData.comment || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm"
              rows="3"
              placeholder="Motivo de la clasificación..."
            />
          </div>

          {/* Botón */}
          <div className="pt-2 flex justify-end">
            <Button onClick={handleSubmit}>Clasificar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClassifyDialog;
