'use client';

import { Column } from '@/types';
import { Hash, Zap } from 'lucide-react';

interface ColumnDragOverlayProps {
  column: Column;
}

export default function ColumnDragOverlay({ column }: ColumnDragOverlayProps) {
  return (
    <div className="glass border-2 border-primary/50 rounded-2xl shadow-2xl transform rotate-2 w-80 animate-pulse-glow">
      <div className="p-4 bg-gradient-to-r from-secondary/50 to-secondary/30 border-b border-border/20 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-primary rounded-lg shadow-glow">
            <Hash className="w-3 h-3 text-white" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {column.title}
          </h3>
          <div className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-primary/30 text-primary rounded-lg border border-primary/30">
            <Zap className="w-3 h-3" />
            <span className="text-xs font-semibold">Moving</span>
          </div>
        </div>
      </div>
      <div className="p-4 min-h-[200px] bg-gradient-to-br from-secondary/20 to-secondary/10">
        <div className="text-xs text-muted-foreground text-center py-12 flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span>Moving column...</span>
        </div>
      </div>
    </div>
  );
}