import React from 'react';
import { ArrowUp, ArrowRight, ArrowDown } from "lucide-react";

const priorityConfig = {
  'Alta': { icon: ArrowUp, bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  'Media': { icon: ArrowRight, bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  'Baja': { icon: ArrowDown, bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
};

export default function PriorityBadge({ priority }) {
  const config = priorityConfig[priority] || priorityConfig['Media'];
  const Icon = config.icon;

  return (
    <span className={`badge-pill ${config.bg} ${config.text} border ${config.border} gap-1`}>
      <Icon className="w-3 h-3" />
      {priority}
    </span>
  );
}