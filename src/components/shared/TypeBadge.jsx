import React from 'react';
import { Wrench, Sparkles, Code2, GraduationCap } from "lucide-react";

const typeConfig = {
  'Soporte': { icon: Wrench, bg: 'bg-orange-500/20', text: 'text-orange-400' },
  'Mejora': { icon: Sparkles, bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  'Desarrollo': { icon: Code2, bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  'Capacitación': { icon: GraduationCap, bg: 'bg-pink-500/20', text: 'text-pink-400' },
};

export default function TypeBadge({ type }) {
  const config = typeConfig[type] || typeConfig['Soporte'];
  const Icon = config.icon;

  return (
    <span className={`badge-pill ${config.bg} ${config.text} gap-1`}>
      <Icon className="w-3 h-3" />
      {type}
    </span>
  );
}