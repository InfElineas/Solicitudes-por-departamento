import { base44 } from '@/api/base44Client';

/**
 * Centralised email notification service.
 * All functions are fire-and-forget (no await needed from callers).
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function requestUrl(requestId) {
  return `${window.location.origin}/Requests`;
}

function emailWrapper(body) {
  return `
<div style="font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:560px;margin:0 auto;">
  <div style="margin-bottom:24px;">
    <span style="font-size:11px;font-weight:600;letter-spacing:2px;color:#475569;text-transform:uppercase;">PLATAFORMA DE SOLICITUDES</span>
  </div>
  ${body}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1e293b;font-size:11px;color:#475569;">
    Este mensaje fue generado automáticamente. No respondas a este correo.
  </div>
</div>`;
}

// ── Email senders ─────────────────────────────────────────────────────────────

/** Send email when a request status changes to 'Finalizada' */
export async function sendFinalizadaEmail(request) {
  const recipients = [];
  if (request.requester_id) recipients.push(request.requester_id);
  if (request.assigned_to_id && request.assigned_to_id !== request.requester_id)
    recipients.push(request.assigned_to_id);

  const body = `
<h2 style="font-size:18px;font-weight:700;color:#4ade80;margin:0 0 8px;">✅ Solicitud finalizada</h2>
<p style="color:#94a3b8;margin:0 0 20px;font-size:14px;">La siguiente solicitud ha sido marcada como <strong style="color:#4ade80;">Finalizada</strong>.</p>
<div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin-bottom:20px;">
  <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#f1f5f9;">${request.title}</p>
  <p style="margin:0;font-size:12px;color:#64748b;">Solicitante: ${request.requester_name || request.requester_id || '—'} &nbsp;·&nbsp; Prioridad: ${request.priority || '—'}</p>
</div>
<a href="${requestUrl(request.id)}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">Ver solicitud →</a>`;

  await Promise.all(
    recipients.map(email =>
      base44.integrations.Core.SendEmail({
        to: email,
        subject: `✅ Solicitud finalizada: ${request.title}`,
        body: emailWrapper(body),
      }).catch(() => {})
    )
  );
}

/** Send email when a high-priority request is assigned */
export async function sendAssignedCriticalEmail(request, techEmail, techName) {
  if (!techEmail) return;
  if (request.priority !== 'Alta') return; // only critical

  const body = `
<h2 style="font-size:18px;font-weight:700;color:#f87171;margin:0 0 8px;">🚨 Nueva tarea crítica asignada</h2>
<p style="color:#94a3b8;margin:0 0 20px;font-size:14px;">Hola <strong style="color:#e2e8f0;">${techName || techEmail}</strong>, se te ha asignado una solicitud de <strong style="color:#f87171;">prioridad Alta</strong>.</p>
<div style="background:#1e293b;border:1px solid #f87171;border-left:4px solid #f87171;border-radius:8px;padding:16px;margin-bottom:20px;">
  <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#f1f5f9;">${request.title}</p>
  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">${request.description?.slice(0, 120) || ''}${(request.description?.length || 0) > 120 ? '...' : ''}</p>
  <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Tipo: ${request.request_type || '—'} &nbsp;·&nbsp; Dificultad: ${request.level || '—'}</p>
</div>
${request.estimated_due ? `<p style="font-size:12px;color:#fbbf24;margin:0 0 20px;">⏰ Fecha compromiso: ${new Date(request.estimated_due).toLocaleString('es')}</p>` : ''}
<a href="${requestUrl(request.id)}" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">Atender solicitud →</a>`;

  await base44.integrations.Core.SendEmail({
    to: techEmail,
    subject: `🚨 Tarea crítica asignada: ${request.title}`,
    body: emailWrapper(body),
  }).catch(() => {});
}

/** Send email to users mentioned with @mention in a comment */
export async function sendMentionEmail({ mentionedEmail, mentionedName, commenterName, commentText, request }) {
  if (!mentionedEmail) return;

  const body = `
<h2 style="font-size:18px;font-weight:700;color:#60a5fa;margin:0 0 8px;">💬 Te mencionaron en un comentario</h2>
<p style="color:#94a3b8;margin:0 0 20px;font-size:14px;">
  <strong style="color:#e2e8f0;">${commenterName || 'Alguien'}</strong> te mencionó en la solicitud 
  <strong style="color:#e2e8f0;">"${request?.title || ''}"</strong>.
</p>
<div style="background:#1e293b;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
  <p style="margin:0;font-size:14px;color:#e2e8f0;font-style:italic;">"${commentText?.slice(0, 200) || ''}${(commentText?.length || 0) > 200 ? '...' : ''}"</p>
</div>
<a href="${requestUrl(request?.id)}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">Ver comentario →</a>`;

  await base44.integrations.Core.SendEmail({
    to: mentionedEmail,
    subject: `💬 Te mencionaron en: ${request?.title || 'una solicitud'}`,
    body: emailWrapper(body),
  }).catch(() => {});
}

/**
 * Parse @mentions from comment text and return matched users.
 * Matches @nombre or @nombre.apellido (case insensitive).
 */
export function extractMentions(text, allUsers) {
  if (!text || !allUsers?.length) return [];
  const matches = [...text.matchAll(/@([\w.]+)/g)].map(m => m[1].toLowerCase());
  if (!matches.length) return [];

  return allUsers.filter(u => {
    const name = (u.full_name || '').toLowerCase().replace(/\s+/g, '.');
    const email = (u.email || '').toLowerCase().split('@')[0];
    return matches.some(m => name.startsWith(m) || email.startsWith(m));
  });
}