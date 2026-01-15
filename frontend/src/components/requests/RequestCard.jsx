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
    <Card className="shadow-sm border border-gray-100">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 min-w-0">
            <CardTitle className="text-lg leading-snug truncate" title={title}>
              {title}
            </CardTitle>
            <CardDescription className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700">
                <span className="font-medium text-gray-900">
                  {requester_name || "-"}
                </span>
                <span className="text-gray-400">•</span>
                <span>{department || "-"}</span>
                <span className="text-gray-400">•</span>
                <span title={created_at || ""}>{fmtDate(created_at)}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {level && <span className="font-medium">Nivel: {level}</span>}
                <span className="font-medium">Tipo:</span>{" "}
                <span>{type || "-"}</span>
                <span className="font-medium">Canal:</span>{" "}
                <span>{channel || "-"}</span>
                {assigned_by_name && (
                  <span className="font-medium">
                    Asignado por: {assigned_by_name}
                  </span>
                )}
                {review_evidence?.url && (
                  <a
                    href={review_evidence.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline inline-flex items-center gap-1 text-blue-700"
                  >
                    <LinkIcon className="h-3 w-3" /> Evidencia
                  </a>
                )}
                {status === "Rechazada" && rejection_reason && (
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <AlertTriangle className="h-3 w-3" /> {rejection_reason}
                  </span>
                )}
              </div>
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

      <CardContent className="space-y-4">
        {description && (
          <p
            className="text-gray-700 leading-relaxed truncate"
            title={description}
          >
            {description}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="space-y-1">
            {assigned_to_name && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Asignado a:</span>
                <span>{assigned_to_name}</span>
              </div>
            )}
            {estimated_hours && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Estimado:</span>
                <span>{estimated_hours} h</span>
              </div>
            )}
            {estimated_due && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Compromiso:</span>
                <span>{fmtDate(estimated_due)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
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
