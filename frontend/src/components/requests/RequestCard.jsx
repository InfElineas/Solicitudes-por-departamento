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
import { cn } from "@/lib/utils";

/* -------- helpers de UI -------- */
const getStatusColor = (status) => {
  switch (status) {
    case "Pendiente":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200";
    case "En progreso":
      return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200";
    case "En revisión":
      return "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200";
    case "Finalizada":
      return "bg-green-100 text-green-800 dark:bg-emerald-500/20 dark:text-emerald-200";
    case "Rechazada":
      return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-slate-700/40 dark:text-slate-200";
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "Alta":
      return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200";
    case "Media":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200";
    case "Baja":
      return "bg-green-100 text-green-800 dark:bg-emerald-500/20 dark:text-emerald-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-slate-700/40 dark:text-slate-200";
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
  className,
}) => {
  const canSendReview = () => {
    if (!user) return false;
    // contemplamos diferentes campos de id de asignación
    const assignedTo = request.assigned_to || request.assigned_to_id;
    const assignedBy = request.requester_id || request.assigned_by;
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
    requester_id,
    review_evidence,
    status,
    rejection_reason,
    priority,
    description,
    assigned_to_name,
    estimated_hours,
    estimated_due,
    feedback,
  } = request || {};

  const descriptionText =
    description && description.length > 160
      ? `${description.slice(0, 160)}…`
      : description;

  return (
    <Card
      className={cn(
        "shadow-sm border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-950/60 backdrop-blur rounded-2xl",
        className,
      )}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getPriorityColor(priority)}>
                {priority || "-"}
              </Badge>
              <Badge className={getStatusColor(status)}>{status || "-"}</Badge>
            </div>
            <CardTitle className="text-lg leading-snug text-slate-900 dark:text-slate-100">
              {title || "Solicitud sin título"}
            </CardTitle>
            <CardDescription className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {requester_name || "-"}
                </span>
                <span className="text-slate-400">•</span>
                <span>{department || "-"}</span>
                <span className="text-slate-400">•</span>
                <span title={created_at || ""}>{fmtDate(created_at)}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-wide text-slate-400">
                {level && <span>Nivel {level}</span>}
                <span>{type || "-"}</span>
                <span>{channel || "-"}</span>
              </div>
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400">
            {assigned_to_name && (
              <span>
                Asignado a{" "}
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {assigned_to_name}
                </span>
              </span>
            )}
            {estimated_hours && <span>{estimated_hours} h estimadas</span>}
            {estimated_due && <span>Compromiso {fmtDate(estimated_due)}</span>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {descriptionText && (
          <p className="text-sm text-slate-600 dark:text-slate-300 min-h-[2.5rem]">
            {descriptionText}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          {requester_name && (
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                Solicitante:
              </span>
              {requester_name}
            </span>
          )}
          {review_evidence?.url && (
            <a
              href={review_evidence.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
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

        <div className="flex flex-wrap gap-2 justify-start">
          {/* Admin: Clasificar / Asignar */}
          {user?.role === "admin" && status === "Pendiente" && (
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
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
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
      </CardContent>
    </Card>
  );
};

export default RequestCard;
