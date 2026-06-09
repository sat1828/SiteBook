import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const overlayRef = useRef();

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={clsx(
        'glass rounded-2xl w-full animate-in',
        sizes[size],
      )}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
