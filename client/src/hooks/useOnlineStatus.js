import { useEffect } from 'react';
import { useOfflineStore } from '../store/store';
import { syncPendingRecords } from '../utils/sync';

export const useOnlineStatus = () => {
  const { setOnline, setPendingSync, pendingSync } = useOfflineStore();

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      const synced = await syncPendingRecords();
      if (synced > 0) {
        setPendingSync(0);
      }
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, setPendingSync]);

  return { pendingSync };
};
