'use client';

import { Column } from '@/types';

interface ColumnDragOverlayProps {
  column: Column;
}

export default function ColumnDragOverlay({ column }: ColumnDragOverlayProps) {
  return (
    <div className="bg-white rounded-lg border shadow-lg transform rotate-2 w-80">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-foreground">
          {column.title}
        </h3>
      </div>
      <div className="p-3 min-h-[200px] bg-secondary/20">
        <div className="text-xs text-muted-foreground text-center py-8">
          Dragging column...
        </div>
      </div>
    </div>
  );
}