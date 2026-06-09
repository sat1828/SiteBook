import { AlertTriangle, RefreshCw } from 'lucide-react';

export const ErrorDisplay = ({ message = 'Something went wrong', onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mb-4">
      <AlertTriangle className="w-8 h-8 text-red-400" />
    </div>
    <h3 className="text-lg font-medium text-text mb-1">Error</h3>
    <p className="text-sm text-text-muted max-w-md mb-4">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn-secondary text-sm flex items-center gap-1.5">
        <RefreshCw className="w-4 h-4" /> Try Again
      </button>
    )}
  </div>
);
