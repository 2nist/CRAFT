import React from 'react';
import { cn } from './cn';

export const Badge = React.forwardRef(function Badge({ className, variant = 'default', ...props }, ref) {
  const styles = {
    default: 'bg-blue-600/20 text-blue-200 border border-blue-500/40',
    secondary: 'bg-slate-800 text-slate-200 border border-slate-700',
    success: 'bg-emerald-600/15 text-emerald-200 border border-emerald-500/40',
    warning: 'bg-amber-600/15 text-amber-200 border border-amber-500/40',
    destructive: 'bg-rose-600/15 text-rose-200 border border-rose-500/40'
  };

  return (
    <span
      ref={ref}
      className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide', styles[variant] || styles.default, className)}
      {...props}
    />
  );
});
