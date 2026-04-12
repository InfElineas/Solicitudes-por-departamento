import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = "Cargando..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      <p className="text-sm text-[hsl(var(--muted-foreground))] mt-3">{text}</p>
    </div>
  );
}