import React from 'react';
import { motion } from 'framer-motion';

export default function StatsCard({ title, value, icon: Icon, color = 'blue', trend, subtitle }) {
  const colorMap = {
    blue: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20',
    green: 'from-green-500/20 to-green-600/5 text-green-400 border-green-500/20',
    yellow: 'from-yellow-500/20 to-yellow-600/5 text-yellow-400 border-yellow-500/20',
    red: 'from-red-500/20 to-red-600/5 text-red-400 border-red-500/20',
    purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20',
    cyan: 'from-cyan-500/20 to-cyan-600/5 text-cyan-400 border-cyan-500/20',
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card bg-gradient-to-br ${c} p-5`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[hsl(var(--muted-foreground))] text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1 text-[hsl(var(--foreground))]">{value}</p>
          {subtitle && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg bg-[hsl(var(--secondary))]`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {trend && (
        <p className={`text-xs mt-3 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs. mes anterior
        </p>
      )}
    </motion.div>
  );
}