import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ size = 'md', className, text }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={clsx('animate-spin text-primary-400', sizes[size])} />
      {text && <p className="text-sm text-text-muted">{text}</p>}
    </div>
  );
};

export const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
);
