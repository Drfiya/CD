import Image from 'next/image';
import { cn } from '@/lib/utils';

const sizes = {
  sm: 32,
  md: 48,
  lg: 96,
} as const;

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return initials || '?';
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const dimension = sizes[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={name || 'Avatar'}
        width={dimension}
        height={dimension}
        unoptimized
        className={cn('rounded-full object-cover', className)}
        style={{ width: dimension, height: dimension }}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-xl',
        className
      )}
      style={{ width: dimension, height: dimension }}
    >
      {getInitials(name)}
    </div>
  );
}
