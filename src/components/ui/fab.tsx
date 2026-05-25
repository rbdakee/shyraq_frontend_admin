import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type FabProps = ButtonHTMLAttributes<HTMLButtonElement>;

const Fab = forwardRef<HTMLButtonElement, FabProps>(function Fab(
  { className, type, ...rest },
  ref,
) {
  return <button ref={ref} type={type ?? 'button'} className={cn('m-fab', className)} {...rest} />;
});

export { Fab };
