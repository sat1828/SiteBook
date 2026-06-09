import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, AlertTriangle, Calendar } from 'lucide-react';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { compliance as compApi } from '../../api/client';

export const ContractorCompliance = () => {
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['compliance-report'],
    queryFn: async () => { const { data } = await compApi.report(); return data; },
  });

  const { data: deadlineData, isLoading: deadlineLoading } = useQuery({
    queryKey: ['compliance-deadlines'],
    queryFn: async () => { const { data } = await compApi.deadlines(); return data; },
  });

  if (reportLoading || deadlineLoading) return <LoadingSpinner size="lg" text="Loading compliance data..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">Statutory Compliance</h1>
        <p className="text-text-muted text-sm mt-1">BOCW Act + Code on Wages 2019 compliance overview</p>
      </div>

      {deadlineData?.deadlines?.length > 0 && (
        <div className="animate-in animate-in-delay-1">
          <GlassCard className="border-yellow-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold">Upcoming Deadlines</h3>
            </div>
            <div className="space-y-2">
              {deadlineData.deadlines.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-subtle">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={d.severity} />
                    <div>
                      <p className="text-sm font-medium">{d.type}</p>
                      <p className="text-xs text-text-muted">{d.siteName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{new Date(d.deadline).toLocaleDateString()}</p>
                    <p className="text-xs text-text-muted">{d.daysRemaining}d remaining</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      <div className="animate-in animate-in-delay-2">
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-accent-400" />
            <h3 className="font-semibold">Site-wise Compliance Summary</h3>
          </div>

          {(!reportData?.summary || reportData.summary.length === 0) ? (
            <p className="text-text-muted text-sm">No sites with active compliance data.</p>
          ) : (
            <div className="space-y-3">
              {reportData.summary.map((s, i) => (
                <div key={i} className="p-4 rounded-xl bg-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{s.siteName}</h4>
                    <StatusBadge status={s.wageRunGenerated ? (s.wageRunStatus === 'paid' ? true : 'warning') : false}
                      label={s.wageRunGenerated ? (s.wageRunStatus === 'paid' ? 'Compliant' : 'Pending') : 'No Wage Run'} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-text-muted text-xs">Workers</p>
                      <p className="font-medium">{s.workerCount}</p>
                    </div>
                    <div>
                      <p className="text-text-muted text-xs">Total Wages</p>
                      <p className="font-medium">₹{(s.totalWages || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-text-muted text-xs">EPF Due</p>
                      <p className="font-medium">₹{(s.epfDue || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-text-muted text-xs">ESIC Due</p>
                      <p className="font-medium">₹{(s.esicDue || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  {s.epfOverdue && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> EPF overdue</p>}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
