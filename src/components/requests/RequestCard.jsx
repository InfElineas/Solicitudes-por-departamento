import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatusBadge from '../shared/StatusBadge';
import PriorityBadge from '../shared/PriorityBadge';
import TypeBadge from '../shared/TypeBadge';
import { Calendar, User, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RequestCard({ request, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={createPageUrl(`RequestDetail?id=${request.id}`)}>
        <div className="glass-card p-4 hover:border-[hsl(var(--primary))]/30 transition-all cursor-pointer group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors truncate">
                {request.title}
              </h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
                {request.description}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <PriorityBadge priority={request.priority} />
            <TypeBadge type={request.type} />
          </div>

          <div className="flex items-center gap-4 mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {request.requester_name || request.requester_id || 'Sin asignar'}
            </span>
            {request.department_names?.length > 0 && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {request.department_names.join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto">
              <Calendar className="w-3 h-3" />
              {new Date(request.created_date).toLocaleDateString('es')}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}