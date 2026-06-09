import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export const useSocketNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?unread=true&limit=1');
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  return { unreadCount, refresh: fetchUnread };
};
