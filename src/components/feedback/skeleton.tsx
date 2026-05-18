import { cn } from '@/lib/cn';

interface SkeletonBaseProps {
  className?: string;
}

interface SkeletonLineProps extends SkeletonBaseProps {
  width?: string | number;
  height?: number;
}

const skeletonBase =
  'animate-[skel_1.4s_ease-in-out_infinite] rounded-[var(--r-sm)] bg-gradient-to-r from-[var(--bg-sunken)] via-[var(--neutral-soft)] to-[var(--bg-sunken)] bg-[length:200%_100%]';

export function SkeletonLine({ width, height = 12, className }: SkeletonLineProps) {
  return <div className={cn(skeletonBase, className)} style={{ width: width ?? '100%', height }} />;
}

export function SkeletonBox({ width, height, className }: SkeletonLineProps & { height?: number }) {
  return (
    <div
      className={cn(skeletonBase, className)}
      style={{ width: width ?? '100%', height: height ?? 80 }}
    />
  );
}

interface SkeletonCircleProps extends SkeletonBaseProps {
  size?: number;
}

export function SkeletonCircle({ size = 40, className }: SkeletonCircleProps) {
  return (
    <div
      className={cn(skeletonBase, 'rounded-full', className)}
      style={{ width: size, height: size }}
    />
  );
}

interface SkeletonTableRowProps extends SkeletonBaseProps {
  columns?: number;
}

export function SkeletonTableRow({ columns = 5, className }: SkeletonTableRowProps) {
  return (
    <div className={cn('flex items-center gap-3.5 px-3.5 py-3', className)}>
      {Array.from({ length: columns }, (_, i) => (
        <SkeletonLine key={i} height={12} width={i === 0 ? '35%' : `${60 + i * 5}px`} />
      ))}
    </div>
  );
}
