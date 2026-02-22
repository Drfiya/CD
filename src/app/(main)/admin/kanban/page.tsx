import { redirect } from 'next/navigation';

/**
 * Redirect old /admin/kanban URL to the unified Command Center board.
 */
export default function KanbanRedirect() {
    redirect('/admin/dev-tracker');
}
