import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Filter } from 'lucide-react';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { DataTable } from '../../components/UI/DataTable';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { attendance as attApi, sites as sitesApi } from '../../api/client';
import { format, parseISO } from 'date-fns';

export const ContractorAttendance = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [siteFilter, setSiteFilter] = useState('');

  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  const { data: attData, isLoading } = useQuery({
    queryKey: ['attendance', siteFilter, date],
    queryFn: async () => {
      if (!siteFilter) return { attendance: [] };
      const { data } = await attApi.getDaily(siteFilter, date);
      return data;
    },
    enabled: !!siteFilter,
  });

  const columns = [
    { header: 'Worker', render: (r) => r.workerName },
    { header: 'Skill', render: (r) => <span className="capitalize text-xs">{r.skill?.replace('_', ' ')}</span> },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { header: 'OT Hours', render: (r) => r.overtimeHours > 0 ? r.overtimeHours : '—' },
    { header: 'Geo Validated', render: (r) => r.geoValidated ? <StatusBadge status={true} label="Yes" /> : <span className="text-text-muted text-xs">No</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">Attendance Overview</h1>
        <p className="text-text-muted text-sm mt-1">View attendance records across sites</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 animate-in animate-in-delay-1">
        <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="select-field sm:w-64">
          <option value="">Select a site to view</option>
          {sitesData?.sites?.filter(s => s.status === 'active').map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field pl-10" />
        </div>
      </div>

      {!siteFilter ? (
        <EmptyState title="Select a site" description="Choose a site above to view daily attendance records." />
      ) : isLoading ? (
        <LoadingSpinner size="lg" text="Loading attendance..." className="min-h-[40vh]" />
      ) : !attData?.attendance || attData.attendance.length === 0 ? (
        <EmptyState title="No attendance for this date" description="Attendance has not been marked for this site on this date." />
      ) : (
        <div className="animate-in animate-in-delay-2">
          <GlassCard className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">{format(parseISO(date), 'EEEE, MMMM d, yyyy')}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <span><StatusBadge status="full" label={`Full: ${attData.attendance.filter(a => a.status === 'full').length}`} /></span>
                <span><StatusBadge status="half" label={`Half: ${attData.attendance.filter(a => a.status === 'half').length}`} /></span>
                <span><StatusBadge status="absent" label={`Absent: ${attData.attendance.filter(a => a.status === 'absent').length}`} /></span>
                <span><StatusBadge status="overtime" label={`OT: ${attData.attendance.filter(a => a.status === 'overtime').length}`} /></span>
              </div>
            </div>
          </GlassCard>
          <DataTable columns={columns} data={attData.attendance} />
        </div>
      )}
    </div>
  );
};
