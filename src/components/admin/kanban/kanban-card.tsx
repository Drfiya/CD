'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanCardData } from '@/lib/kanban-actions';

interface KanbanCardProps {
    card: KanbanCardData;
    onEdit: (card: KanbanCardData) => void;
    onDelete: (id: string) => void;
}

export function KanbanCard({ card, onEdit, onDelete }: KanbanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: card.id, data: { card } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
        group bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm
        hover:shadow-md hover:border-gray-300 dark:hover:border-neutral-600 transition-all duration-200
        ${isDragging ? 'opacity-50 shadow-lg scale-[1.02] rotate-1' : ''}
      `}
        >
            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="px-4 pt-3 pb-1 cursor-grab active:cursor-grabbing flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-300 dark:text-neutral-600 group-hover:text-gray-400 dark:group-hover:text-neutral-500 transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                </svg>
                <span className="text-xs text-gray-300 dark:text-neutral-600 group-hover:text-gray-400 dark:group-hover:text-neutral-500 transition-colors">Drag</span>
            </div>

            {/* Image */}
            {card.imageUrl && (
                <div className="px-3 pt-1">
                    <div className="rounded-lg overflow-hidden">
                        <img
                            src={card.imageUrl}
                            alt={card.title}
                            className="w-full h-32 object-cover"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="px-4 py-3">
                <h3 className="font-semibold text-gray-900 dark:text-neutral-100 text-sm leading-snug">{card.title}</h3>
                {card.description && (
                    <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1.5 line-clamp-3 leading-relaxed">
                        {card.description}
                    </p>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    {card.createdBy.image ? (
                        <img
                            src={card.createdBy.image}
                            alt={card.createdBy.name || ''}
                            className="w-5 h-5 rounded-full"
                        />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-blue-600">
                                {card.createdBy.name?.[0]?.toUpperCase() || '?'}
                            </span>
                        </div>
                    )}
                    <span className="text-[11px] text-gray-400">
                        {card.createdBy.name?.split(' ')[0] || 'Unknown'}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(card)}
                        className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        title="Edit"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDelete(card.id)}
                        className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
