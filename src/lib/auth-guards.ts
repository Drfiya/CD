import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';

/**
 * Require an authenticated session. Throws `Error('Unauthorized')` when no
 * session or no user id is present. Returns the full session for callers that
 * need `session.user.id` / `session.user.role`.
 *
 * Use as the first statement of every `'use server'` export that is
 * user-facing (post creation, comment like, lesson progress, etc.) so that
 * the action cannot be invoked anonymously via the RSC stream.
 */
export async function requireAuth(): Promise<Session> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }
    return session;
}

/**
 * Require an admin-level session (admin or owner). Throws
 * `Error('Unauthorized')` when the session is missing or the caller's role
 * is below admin. Returns the session for callers that need it.
 *
 * Use as the first statement of every admin-only read or write — dashboards,
 * audit logs, settings, dev-tracker, API-usage, language settings — so that
 * no admin-class action can be invoked by a regular authenticated member.
 */
export async function requireAdmin(): Promise<Session> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !canEditSettings(session.user.role)) {
        throw new Error('Unauthorized');
    }
    return session;
}

/**
 * Require that the session user is either the `ownerId` or an admin/owner.
 * Throws `Error('Unauthorized')` otherwise. Used for actions that take a
 * `userId` argument and return that user's private data (enrollment,
 * lesson progress) so one member cannot enumerate another's state.
 */
export async function requireOwnerOrAdmin(ownerId: string): Promise<Session> {
    const session = await requireAuth();
    if (session.user.id === ownerId) {
        return session;
    }
    if (canEditSettings(session.user.role)) {
        return session;
    }
    throw new Error('Unauthorized');
}
