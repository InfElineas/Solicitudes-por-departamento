import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function PageNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="p-5 rounded-2xl bg-[hsl(var(--secondary))] mb-6">
        <FileQuestion className="w-12 h-12 text-[hsl(var(--muted-foreground))]" />
      </div>
      <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">404</h1>
      <p className="text-[hsl(var(--muted-foreground))] mb-6 max-w-sm">
        La página que buscas no existe o fue movida.
      </p>
      <Link to={createPageUrl('Dashboard')}>
        <Button className="bg-[hsl(var(--primary))] text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Dashboard
        </Button>
      </Link>
    </div>
  );
}