import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Settings2,
  UserPlus,
  ThumbsUp,
  ThumbsDown,
  Link as LinkIcon,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

/* -------- helpers de UI -------- */
const getStatusColor = (status) => {
  switch (status) {
    case "Pendiente":
      return "bg-yellow-100 text-yellow-800";
    case "En progreso":
      return "bg-blue-100 text-blue-800";
    case "En revisión":
      return "bg-purple-100 text-purple-800";
    case "Finalizada":
      return "bg-green-100 text-green-800";
    case "Rechazada":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "Alta":
      return "bg-red-100 text-red-800";
    case "Media":
      return "bg-yellow-100 text-yellow-800";
    case "Baja":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const fmtDate = (d) => {
  try {
    return d ? new Date(d).toLocaleDateString() : "-";
  } catch {
    return "-";
  }
};

const RequestCard = ({
  request,
  user,
  deleteRequest,
  setClassifyDialogFor,
  setClassifyData,
  setAssignDialogFor,
  setAssignData,
  setFeedbackDialogFor,
  takeRequest,
  rejectRequest,
  sendToReview,
  backToProgress,
  finishRequest,
  // estos 4 se pasan desde arriba pero no se usan localmente; los dejo para no romper firmas
  setEditDialogFor,
  editDialogFor,
  editData,
  setEditData,
  onView,
  onEdit,
}) => {
  const canSendReview = () => {
    if (!user) return false;
    // contemplamos diferentes campos de id de asignación
    const assignedTo = request.assigned_to || request.assigned_to_id;
    const assignedBy = request.assigned_by_id || request.assigned_by;
    return (
      user.role === "admin" || user.id === assignedTo || user.id === assignedBy
    );
  };

  const {
    id,
    title,
    requester_name,
    department,
    created_at,
    level,
    type,
    channel,
    assigned_by_name,
    review_evidence,
    status,
    rejection_reason,
    priority,
    description,
    assigned_to_name,
    estimated_hours,
    estimated_due,
    feedback,
    requester_id,
  } = request || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600">
              <span>{requester_name || "-"}</span>
              <span>•</span>
              <span>{department || "-"}</span>
              <span>•</span>
              <span title={created_at || ""}>{fmtDate(created_at)}</span>
              {level && (
                <>
                  <span>•</span>
                  <span className="font-medium">Nivel de dificultad:</span>{" "}
                  {level}
                </>
              )}
              <span>•</span>
              <span className="font-medium">Tipo:</span> {type || "-"}
              <span>•</span>
              <span className="font-medium">Canal:</span> {channel || "-"}
              {assigned_by_name && (
                <>
                  <span>•</span>
                  <span className="font-medium">Asignado por:</span>{" "}
                  {assigned_by_name}
                </>
              )}
              {review_evidence?.url && (
                <>
                  <span>•</span>
                  <a
                    href={review_evidence.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline inline-flex items-center gap-1"
                  >
                    <LinkIcon className="h-3 w-3" /> Evidencia
                  </a>
                </>
              )}
              {status === "Rechazada" && rejection_reason && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <AlertTriangle className="h-3 w-3" /> {rejection_reason}
                  </span>
                </>
              )}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getPriorityColor(priority)}>
              {priority || "-"}
            </Badge>
            <Badge className={getStatusColor(status)}>{status || "-"}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {description && <p className="text-gray-600 mb-4">{description}</p>}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-500 space-y-1">
            {assigned_to_name && (
              <div>
                <span className="font-medium">Asignado a:</span>{" "}
                {assigned_to_name}
              </div>
            )}
            {estimated_hours && (
              <div>
                <span className="font-medium">Estimado:</span> {estimated_hours}{" "}
                h
              </div>
            )}
            {estimated_due && (
              <div>
                <span className="font-medium">Compromiso:</span>{" "}
                {fmtDate(estimated_due)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Admin: Clasificar / Asignar */}
            {user?.role === "admin" && status !== "En progreso" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setClassifyDialogFor(id);
                    setClassifyData({
                      level: "1",
                      priority: priority || "Media",
                    });
                  }}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Clasificar
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAssignDialogFor(id);
                    setAssignData({
                      assigned_to: "",
                      estimated_hours: "",
                      estimated_due: "",
                    });
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Asignar
                </Button>
              </>
            )}

            {/* Ver detalle */}
            <Button size="sm" variant="outline" onClick={() => onView?.(id)}>
              Ver detalles
            </Button>

            {/* Editar (solo admin por política habitual; quita el check si quieres abrirlo a más roles) */}
            {user?.role === "admin" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onEdit?.(id, {
                    title,
                    description,
                    type,
                    channel,
                    department,
                  })
                }
              >
                Editar
              </Button>
            )}

            {/* Tomar / Rechazar */}
            {(user?.role === "support" || user?.role === "admin") &&
              status === "Pendiente" && (
                <>
                  <Button size="sm" onClick={() => takeRequest(id)}>
                    Tomar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectRequest(id)}
                  >
                    Rechazar
                  </Button>
                </>
              )}

            {/* Enviar a revisión */}
            {(user?.role === "support" || user?.role === "admin") &&
              status === "En progreso" && (
                <Button
                  size="sm"
                  onClick={() =>
                    canSendReview()
                      ? sendToReview(id)
                      : toast.error(
                          "No tienes permisos para enviar a revisión.",
                        )
                  }
                >
                  Enviar a revisión
                </Button>
              )}

            {/* Revisar -> Finalizar o devolver */}
            {(user?.role === "support" || user?.role === "admin") &&
              status === "En revisión" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => backToProgress(id)}
                  >
                    Devolver a progreso
                  </Button>
                  <Button size="sm" onClick={() => finishRequest(id)}>
                    Finalizar
                  </Button>
                </>
              )}

            {/* Feedback del solicitante */}
            {status === "Finalizada" &&
              !feedback &&
              user?.id === requester_id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFeedbackDialogFor(id)}
                >
                  Valorar
                </Button>
              )}
            {status === "Finalizada" && feedback && (
              <div className="flex items-center text-sm text-gray-600">
                {feedback.rating === "up" ? (
                  <ThumbsUp className="h-4 w-4 mr-1" />
                ) : (
                  <ThumbsDown className="h-4 w-4 mr-1" />
                )}
                <span>Feedback enviado</span>
              </div>
            )}

            {/* Eliminar (admin) */}
            {user?.role === "admin" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteRequest(id)}
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestCard;
