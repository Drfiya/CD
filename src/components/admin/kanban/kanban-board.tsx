'use client';

import { useState, useCallback } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { KanbanCardModal } from './kanban-card-modal';
import {
    createKanbanCard,
    updateKanbanCard,
    moveKanbanCard,
    deleteKanbanCard,
    type KanbanCardData,
} from '@/lib/kanban-actions';
import type { KanbanStatus } from '@/generated/prisma/client';

interface KanbanBoardProps {
    initialData: {
        TODO: KanbanCardData[];
        IN_PROGRESS: KanbanCardData[];
        DONE: KanbanCardData[];
    };
}

const COLUMNS: {
    id: KanbanStatus;
    title: string;
    color: string;
    icon: React.ReactNode;
}[] = [
        {
            id: 'TODO',
            title: 'New',
            color: 'bg-blue-100 text-blue-600',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            ),
        },
        {
            id: 'IN_PROGRESS',
            title: 'In Progress',
            color: 'bg-amber-100 text-amber-600',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.193-.14 1.743" />
                </svg>
            ),
        },
        {
            id: 'DONE',
            title: 'Done',
            color: 'bg-green-100 text-green-600',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            ),
        },
    ];

export function KanbanBoard({ initialData }: KanbanBoardProps) {
    const [cards, setCards] = useState(initialData);
    const [activeCard, setActiveCard] = useState<KanbanCardData | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<KanbanCardData | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Find which column a card belongs to
    const findColumn = useCallback(
        (cardId: string): KanbanStatus | null => {
            for (const status of ['TODO', 'IN_PROGRESS', 'DONE'] as KanbanStatus[]) {
                if (cards[status].some((c) => c.id === cardId)) return status;
            }
            return null;
        },
        [cards]
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const col = findColumn(active.id as string);
        if (col) {
            const card = cards[col].find((c) => c.id === active.id);
            if (card) setActiveCard(card);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeCol = findColumn(activeId);
        // over might be a column id or a card id
        const overCol = (['TODO', 'IN_PROGRESS', 'DONE'] as KanbanStatus[]).includes(overId as KanbanStatus)
            ? (overId as KanbanStatus)
            : findColumn(overId);

        if (!activeCol || !overCol || activeCol === overCol) return;

        setCards((prev) => {
            const activeCards = [...prev[activeCol]];
            const overCards = [...prev[overCol]];

            const activeIndex = activeCards.findIndex((c) => c.id === activeId);
            if (activeIndex === -1) return prev;

            const [movedCard] = activeCards.splice(activeIndex, 1);
            const overIndex = overCards.findIndex((c) => c.id === overId);
            const insertIndex = overIndex >= 0 ? overIndex : overCards.length;

            overCards.splice(insertIndex, 0, { ...movedCard, status: overCol });

            return {
                ...prev,
                [activeCol]: activeCards,
                [overCol]: overCards,
            };
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCard(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeCol = findColumn(activeId);
        if (!activeCol) return;

        const cardIndex = cards[activeCol].findIndex((c) => c.id === activeId);
        if (cardIndex === -1) return;

        // If dropped on another card in same column, reorder
        if (activeId !== overId) {
            const overCol = findColumn(overId);
            if (overCol === activeCol) {
                const overIndex = cards[activeCol].findIndex((c) => c.id === overId);
                if (overIndex !== -1 && cardIndex !== overIndex) {
                    setCards((prev) => {
                        const newCards = [...prev[activeCol]];
                        const [moved] = newCards.splice(cardIndex, 1);
                        newCards.splice(overIndex, 0, moved);
                        return { ...prev, [activeCol]: newCards };
                    });
                    await moveKanbanCard(activeId, activeCol, overIndex);
                    return;
                }
            }
        }

        // Persist the move
        await moveKanbanCard(activeId, activeCol, cardIndex);
    };

    const handleCreate = async (data: { title: string; description?: string; imageUrl?: string }) => {
        const result = await createKanbanCard(data);
        if (result.success) {
            // Optimistic: reload from server
            const { getKanbanCards } = await import('@/lib/kanban-actions');
            const fresh = await getKanbanCards();
            setCards(fresh);
        }
        setModalOpen(false);
    };

    const handleEdit = async (data: { title: string; description?: string; imageUrl?: string }) => {
        if (!editingCard) return;
        const result = await updateKanbanCard(editingCard.id, {
            title: data.title,
            description: data.description || null,
            imageUrl: data.imageUrl || null,
        });
        if (result.success) {
            const { getKanbanCards } = await import('@/lib/kanban-actions');
            const fresh = await getKanbanCards();
            setCards(fresh);
        }
        setEditingCard(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Really delete this card?')) return;
        const result = await deleteKanbanCard(id);
        if (result.success) {
            setCards((prev) => ({
                TODO: prev.TODO.filter((c) => c.id !== id),
                IN_PROGRESS: prev.IN_PROGRESS.filter((c) => c.id !== id),
                DONE: prev.DONE.filter((c) => c.id !== id),
            }));
        }
    };

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {COLUMNS.map((col) => (
                        <KanbanColumn
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            color={col.color}
                            icon={col.icon}
                            cards={cards[col.id]}
                            onEdit={(card) => setEditingCard(card)}
                            onDelete={handleDelete}
                            onAddCard={col.id === 'TODO' ? () => setModalOpen(true) : undefined}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeCard ? (
                        <div className="opacity-90 rotate-2 scale-105">
                            <KanbanCard
                                card={activeCard}
                                onEdit={() => { }}
                                onDelete={() => { }}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Create modal */}
            <KanbanCardModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleCreate}
                mode="create"
            />

            {/* Edit modal */}
            <KanbanCardModal
                isOpen={!!editingCard}
                onClose={() => setEditingCard(null)}
                onSave={handleEdit}
                initialData={editingCard || undefined}
                mode="edit"
            />
        </>
    );
}
