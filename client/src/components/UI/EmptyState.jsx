import { Inbox } from 'lucide-react';

export const EmptyState = ({ title = 'No data found', description, action, icon }) => {
  const renderIcon = () => {
    if (!icon) return <Inbox className="w-8 h-8 text-text-muted" />;
    if (typeof icon === 'function' || typeof icon === 'object') {
      const IconComponent = icon;
      return <IconComponent className="w-8 h-8 text-text-muted" />;
    }
    return icon;
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mb-4">
        {renderIcon()}
      </div>
    <h3 className="text-lg font-medium text-text mb-1">{title}</h3>
    {description && <p className="text-sm text-text-muted max-w-md mb-4">{description}</p>}
    {action && <div>{action}</div>}
    </div>
  );
};
