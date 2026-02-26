'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LevelBadge } from '@/components/gamification/level-badge';
import { RoleBadge } from '@/components/admin/role-badge';
import { BanDialog } from '@/components/admin/ban-dialog';
import { changeUserRole, removeUser } from '@/lib/admin-actions';
import type { AdminMember } from '@/lib/admin-actions';
import type { Role } from '@/lib/permissions';

interface MemberTableProps {
  members: AdminMember[];
  actorRole: Role;
}

const ASSIGNABLE_ROLES: { role: Role; label: string }[] = [
  { role: 'member', label: 'Member' },
  { role: 'moderator', label: 'Moderator' },
  { role: 'admin', label: 'Admin' },
];

function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  const hierarchy: Record<Role, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    member: 1,
  };
  // Can only assign roles strictly below own role
  return hierarchy[actorRole] > hierarchy[targetRole];
}

function canManageUser(actorRole: Role, targetRole: Role): boolean {
  const hierarchy: Record<Role, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    member: 1,
  };
  // Can only manage users strictly below own role
  return hierarchy[actorRole] > hierarchy[targetRole];
}

export function MemberTable({ members, actorRole }: MemberTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [banDialogUserId, setBanDialogUserId] = useState<string | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(
    null
  );
  const [removeReason, setRemoveReason] = useState('');

  const handleRoleChange = (userId: string, newRole: Role) => {
    startTransition(async () => {
      setError(null);
      const result = await changeUserRole(userId, newRole);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const handleRemove = (userId: string) => {
    if (!removeReason.trim()) {
      setError('Please provide a reason for removal');
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await removeUser(userId, removeReason);
      if (!result.success) {
        setError(result.error);
        setConfirmingRemoveId(null);
        return;
      }
      setConfirmingRemoveId(null);
      setRemoveReason('');
      router.refresh();
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (members.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">No members found.</p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="pb-3 pr-4 font-medium">Member</th>
              <th className="pb-3 pr-4 font-medium">Role</th>
              <th className="pb-3 pr-4 font-medium">Points</th>
              <th className="pb-3 pr-4 font-medium">Level</th>
              <th className="pb-3 pr-4 font-medium">Joined</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const canManage = canManageUser(actorRole, member.role as Role);
              const isConfirmingRemove = confirmingRemoveId === member.id;

              return (
                <tr
                  key={member.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  {/* Member info */}
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={member.image}
                        name={member.name}
                        size="sm"
                      />
                      <div>
                        <div className="font-medium">
                          {member.name || 'Unnamed'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role with dropdown */}
                  <td className="py-4 pr-4">
                    {canManage ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.id, e.target.value as Role)
                        }
                        disabled={isPending}
                        className="border rounded px-2 py-1 text-sm bg-white"
                      >
                        {ASSIGNABLE_ROLES.filter((r) =>
                          canAssignRole(actorRole, r.role)
                        ).map((r) => (
                          <option key={r.role} value={r.role}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                  </td>

                  {/* Points */}
                  <td className="py-4 pr-4">
                    <span className="text-sm">{member.points}</span>
                  </td>

                  {/* Level */}
                  <td className="py-4 pr-4">
                    <LevelBadge level={member.level} size="sm" />
                  </td>

                  {/* Join date */}
                  <td className="py-4 pr-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </span>
                  </td>

                  {/* Ban status */}
                  <td className="py-4 pr-4">
                    {member.activeBan ? (
                      <div className="text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Banned
                        </span>
                        {member.activeBan.expiresAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Until {formatDate(member.activeBan.expiresAt)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4">
                    {canManage && !member.activeBan && (
                      <div className="flex items-center gap-2">
                        {isConfirmingRemove ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Reason for removal"
                              value={removeReason}
                              onChange={(e) => setRemoveReason(e.target.value)}
                              className="border rounded px-2 py-1 text-sm w-40"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setConfirmingRemoveId(null);
                                setRemoveReason('');
                              }}
                              disabled={isPending}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemove(member.id)}
                              disabled={isPending || !removeReason.trim()}
                            >
                              {isPending ? 'Removing...' : 'Confirm'}
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBanDialogUserId(member.id)}
                              className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                            >
                              Ban
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmingRemoveId(member.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                    {member.activeBan && canManage && (
                      <span className="text-xs text-muted-foreground">
                        Ban active
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ban dialog */}
      {banDialogUserId && (
        <BanDialog
          userId={banDialogUserId}
          userName={
            members.find((m) => m.id === banDialogUserId)?.name || 'User'
          }
          onClose={() => setBanDialogUserId(null)}
          onSuccess={() => {
            setBanDialogUserId(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
