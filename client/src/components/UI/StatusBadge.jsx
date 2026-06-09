import { clsx } from 'clsx';

const statusStyles = {
  active: 'badge-success',
  completed: 'badge-info',
  on_hold: 'badge-warning',
  draft: 'badge-neutral',
  approved: 'badge-success',
  paid: 'badge-info',
  full: 'badge-success',
  half: 'badge-warning',
  absent: 'badge-danger',
  overtime: 'badge-info',
  present: 'badge-success',
  high: 'badge-warning',
  critical: 'badge-danger',
  warning: 'badge-warning',
  true: 'badge-success',
  false: 'badge-neutral',
};

export const StatusBadge = ({ status, label, className }) => {
  const style = statusStyles[status] || statusStyles[String(status)] || 'badge-neutral';
  return (
    <span className={clsx('badge', style, className)}>
      {label || String(status).replace(/_/g, ' ')}
    </span>
  );
};
