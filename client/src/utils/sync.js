import api from '../api/client';
import { getUnsyncedAttendance, markAsSynced } from './offlineDB';

export const syncPendingRecords = async () => {
  try {
    const unsynced = await getUnsyncedAttendance();
    if (unsynced.length === 0) return 0;

    const grouped = {};
    for (const record of unsynced) {
      const key = `${record.siteId}_${record.date}`;
      if (!grouped[key]) {
        grouped[key] = { siteId: record.siteId, date: record.date, records: [] };
      }
      grouped[key].records.push({
        workerId: record.workerId,
        status: record.status,
        overtimeHours: record.overtimeHours || 0,
        offlineId: record.offlineId,
        geoCoordinates: record.geoCoordinates,
      });
    }

    let syncedCount = 0;
    for (const key of Object.keys(grouped)) {
      const batch = grouped[key];
      try {
        await api.post('/attendance/bulk', batch);
        const ids = batch.records.map(r => r.offlineId);
        if (ids.length > 0) {
          await markAsSynced(ids);
        }
        syncedCount += batch.records.length;
      } catch (error) {
        console.error(`Sync failed for batch ${key}:`, error.message);
      }
    }

    return syncedCount;
  } catch (error) {
    console.error('Sync error:', error.message);
    return 0;
  }
};
