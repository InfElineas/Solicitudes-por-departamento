import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = "Sin resultados", description = "No se encontraron registros." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-[hsl(var(--secondary))] mb-4">
        <Icon className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
      </div>
      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h3>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-sm">{description}</p>
    </div>
  );
}