import React from 'react';
import StatusBadge from '../shared/StatusBadge';
import { ArrowRight } from 'lucide-react';

export default function RequestTimeline({ history = [] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-[hsl(var(--muted-foreground))] py-4">Sin historial de cambios.</p>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry, i) => (
        <div key={entry.id || i} className="flex items-start gap-3">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] mt-2" />
            {i < history.length - 1 && (
              <div className="absolute top-4 left-[3px] w-0.5 h-full bg-[hsl(var(--border))]" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {entry.from_status && <StatusBadge status={entry.from_status} size="sm" />}
              {entry.from_status && <ArrowRight className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />}
              <StatusBadge status={entry.to_status} size="sm" />
            </div>
            {entry.note && (
              <p className="text-xs text-[hsl(var(--foreground))] mt-1">{entry.note}</p>
            )}
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
              {entry.by_user_name || entry.by_user_id} · {new Date(entry.created_date).toLocaleString('es')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}