import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ClipboardCheck } from 'lucide-react';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { attendance as attApi, sites as sitesApi } from '../../api/client';

export const ComplianceVerify = () => {
  const [siteFilter, setSiteFilter] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: sitesData } = useQuery({
    queryKey: ['comp-sites-list'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  const { data: attData, isLoading } = useQuery({
    queryKey: ['verify-att', siteFilter, date],
    queryFn: async () => {
      if (!siteFilter) return { attendance: [] };
      const { data } = await attApi.getDaily(siteFilter, date);
      return data;
    },
    enabled: !!siteFilter,
  });

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">Verify Attendance Records</h1>
        <p className="text-text-muted text-sm mt-1">Audit worker attendance logs</p>
      </div>

      <div className="flex gap-3 animate-in animate-in-delay-1">
        <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="select-field sm:w-64">
          <option value="">Select site...</option>
          {sitesData?.sites?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field w-44" />
      </div>

      {!siteFilter ? (
        <div className="animate-in animate-in-delay-2">
          <GlassCard className="text-center py-16">
            <Search className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-1">Select filters</h3>
            <p className="text-text-muted text-sm">Choose a site and date to verify attendance records.</p>
          </GlassCard>
        </div>
      ) : isLoading ? (
        <LoadingSpinner size="lg" text="Loading records..." className="min-h-[40vh]" />
      ) : (
        <div className="animate-in animate-in-delay-2">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Attendance on {new Date(date).toLocaleDateString('en-IN')}</h3>
              <div className="flex gap-3 text-sm">
                <span className="text-accent-400">Present: {attData?.attendance?.filter(a => a.status !== 'absent').length || 0}</span>
                <span className="text-red-400">Absent: {attData?.attendance?.filter(a => a.status === 'absent').length || 0}</span>
              </div>
            </div>

            {!attData?.attendance?.length ? (
              <p className="text-text-muted text-sm">No records for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Worker</th>
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Skill</th>
                      <th className="text-center py-2 px-2 text-text-muted font-medium">Status</th>
                      <th className="text-center py-2 px-2 text-text-muted font-medium">OT Hours</th>
                      <th className="text-center py-2 px-2 text-text-muted font-medium">Geo Validated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {attData.attendance.map((a, i) => (
                      <tr key={i}>
                        <td className="py-2 px-2">{a.workerName}</td>
                        <td className="py-2 px-2 capitalize text-xs">{a.skill?.replace('_', ' ')}</td>
                        <td className="py-2 px-2 text-center"><StatusBadge status={a.status} /></td>
                        <td className="py-2 px-2 text-center text-text-muted">{a.overtimeHours || '—'}</td>
                        <td className="py-2 px-2 text-center">{a.geoValidated ? <StatusBadge status={true} label="Yes" /> : <span className="text-xs text-text-muted">No</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
};
