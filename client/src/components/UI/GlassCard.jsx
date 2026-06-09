import { clsx } from 'clsx';

export const GlassCard = ({ children, className, hover = false, onClick, ...props }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'glass rounded-2xl p-6',
        hover && 'glass-hover cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const GlassCardHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);
