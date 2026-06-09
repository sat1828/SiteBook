import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, MapPin, Wifi, WifiOff, Check, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useOfflineStore } from '../../store/store';
import { attendance as attApi, sites as sitesApi, workers as workersApi } from '../../api/client';
import { saveAttendanceOffline, getPendingCount } from '../../utils/offlineDB';
import { syncPendingRecords } from '../../utils/sync';
import { format } from 'date-fns';

export const SupervisorAttendance = () => {
  const queryClient = useQueryClient();
  const [selectedSite, setSelectedSite] = useState('');
  const today = format(new Date(), 'yyyy-MM-dd');
  const { position, loading: geoLoading, getCurrentPosition } = useGeolocation();
  const { isOnline, setPendingSync } = useOfflineStore();
  const [attendanceMap, setAttendanceMap] = useState({});
  const [pendingOffline, setPendingOffline] = useState(0);

  const { data: sitesData } = useQuery({
    queryKey: ['my-sites'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  const { data: workersData, isLoading: workersLoading } = useQuery({
    queryKey: ['site-workers', selectedSite],
    queryFn: async () => { const { data } = await workersApi.list({ siteId: selectedSite, isActive: 'true' }); return data; },
    enabled: !!selectedSite,
  });

  const { data: existingAtt } = useQuery({
    queryKey: ['daily-att', selectedSite, today],
    queryFn: async () => {
      if (!selectedSite) return { attendance: [] };
      const { data } = await attApi.getDaily(selectedSite, today);
      return data;
    },
    enabled: !!selectedSite,
  });

  useEffect(() => {
    if (existingAtt?.attendance) {
      const map = {};
      existingAtt.attendance.forEach(a => {
        map[a.workerId] = { status: a.status, overtimeHours: a.overtimeHours || 0 };
      });
      setAttendanceMap(map);
    }
  }, [existingAtt]);

  useEffect(() => {
    const checkPending = async () => {
      const count = await getPendingCount();
      setPendingOffline(count);
      setPendingSync(count);
    };
    checkPending();
    const interval = setInterval(checkPending, 10000);
    return () => clearInterval(interval);
  }, [setPendingSync]);

  const markMutation = useMutation({
    mutationFn: async (data) => {
      if (isOnline) {
        return attApi.mark(data);
      } else {
        await saveAttendanceOffline(data);
        return { data: { attendance: { ...data, syncedFromOffline: true } } };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-att', selectedSite, today] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const handleMark = (workerId, status) => {
    if (!selectedSite) { toast.error('Select a site first'); return; }

    const current = attendanceMap[workerId];
    const newStatus = current?.status === status ? null : status;

    setAttendanceMap(prev => ({
      ...prev,
      [workerId]: newStatus ? { status: newStatus, overtimeHours: current?.overtimeHours || 0 } : undefined,
    }));

    if (newStatus) {
      markMutation.mutate({
        workerId,
        siteId: selectedSite,
        date: today,
        status: newStatus,
        overtimeHours: 0,
        geoCoordinates: position ? [position.lng, position.lat] : undefined,
        offlineId: `off_${Date.now()}_${workerId}`,
      });
    }
  };

  const handleSync = async () => {
    const count = await syncPendingRecords();
    if (count > 0) {
      toast.success(`${count} records synced`);
      setPendingOffline(0);
      queryClient.invalidateQueries({ queryKey: ['daily-att', selectedSite, today] });
    } else {
      toast('No pending records');
    }
  };

  const statuses = [
    { key: 'full', label: 'Full', color: 'bg-accent-500/20 text-accent-400 border-accent-500/30' },
    { key: 'half', label: 'Half', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    { key: 'absent', label: 'Absent', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    { key: 'overtime', label: 'OT', color: 'bg-primary-500/20 text-primary-400 border-primary-500/30' },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mark Attendance</h1>
            <p className="text-text-muted text-sm mt-1">{format(new Date(today), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs">
                <WifiOff className="w-3.5 h-3.5" />
                Offline — {pendingOffline} pending
              </div>
            )}
            {pendingOffline > 0 && isOnline && (
              <Button size="sm" variant="secondary" onClick={handleSync}>
                <Save className="w-3.5 h-3.5 mr-1" /> Sync ({pendingOffline})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 animate-in animate-in-delay-1">
        <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} className="select-field sm:w-72">
          <option value="">Select your site...</option>
          {sitesData?.sites?.filter(s => s.status === 'active').map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>

        <Button variant="secondary" size="sm" onClick={getCurrentPosition} disabled={geoLoading} className="flex items-center gap-1.5">
          <MapPin className={`w-4 h-4 ${position ? 'text-accent-400' : ''}`} />
          {position ? 'Location captured' : 'Get location'}
        </Button>
      </div>

      {!selectedSite ? (
        <div className="animate-in animate-in-delay-2">
          <GlassCard className="text-center py-16">
            <Camera className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-1">Select a site to begin</h3>
            <p className="text-text-muted text-sm">Choose your active site above and mark attendance for each worker.</p>
          </GlassCard>
        </div>
      ) : workersLoading ? (
        <LoadingSpinner size="lg" text="Loading workers..." className="min-h-[40vh]" />
      ) : !workersData?.workers?.length ? (
        <GlassCard className="text-center py-12">
          <p className="text-text-muted">No active workers assigned to this site.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in animate-in-delay-2">
          {workersData.workers.map((worker) => {
            const current = attendanceMap[worker._id];
            return (
              <GlassCard key={worker._id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{worker.name}</h3>
                    <p className="text-xs text-text-muted capitalize">{worker.skill?.replace('_', ' ')}</p>
                    {worker.phone && <p className="text-xs text-text-muted">{worker.phone}</p>}
                  </div>
                  {current && <StatusBadge status={current.status} />}
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {statuses.map(s => (
                    <button
                      key={s.key}
                      onClick={() => handleMark(worker._id, s.key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 
                        ${current?.status === s.key
                          ? `${s.color} ring-1 ring-inset`
                          : 'text-text-muted bg-subtle-hover'
                        }`}
                    >
                      {current?.status === s.key ? <Check className="w-3 h-3 inline mr-1" /> : null}
                      {s.label}
                    </button>
                  ))}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
