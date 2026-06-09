import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { compliance as compApi } from '../../api/client';

export const ComplianceReport = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['comp-report'],
    queryFn: async () => { const { data } = await compApi.report(); return data; },
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Generating compliance report..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">Compliance Audit Report</h1>
        <p className="text-text-muted text-sm mt-1">Read-only compliance verification view</p>
      </div>

      {!data?.summary?.length ? (
        <EmptyState title="No compliance data" description="No contractor data available for audit." icon={ShieldCheck} />
      ) : (
        <div className="space-y-4 animate-in animate-in-delay-1">
          {data.summary.map((s, i) => (
            <GlassCard key={i}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{s.siteName}</h3>
                  <p className="text-xs text-text-muted">{s.workerCount} workers | {s.wageRunGenerated ? 'Wage run generated' : 'No wage run'}</p>
                </div>
                <StatusBadge status={s.wageRunStatus || 'draft'} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 rounded-xl bg-subtle">
                  <p className="text-text-muted text-xs mb-0.5">Total Wages</p>
                  <p className="font-semibold">₹{(s.totalWages || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-subtle">
                  <p className="text-text-muted text-xs mb-0.5">EPF Due</p>
                  <p className="font-semibold">₹{(s.epfDue || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-subtle">
                  <p className="text-text-muted text-xs mb-0.5">ESIC Due</p>
                  <p className="font-semibold">₹{(s.esicDue || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-subtle">
                  <p className="text-text-muted text-xs mb-0.5">Cess Due</p>
                  <p className="font-semibold">₹{Math.round((s.totalWages || 0) * 0.01).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-4 text-xs text-text-muted">
                <span>EPF: {s.epfOverdue ? 'OVERDUE' : s.epfDeadline ? `Due ${new Date(s.epfDeadline).toLocaleDateString()}` : 'N/A'}</span>
                <span>ESIC: {s.esicOverdue ? 'OVERDUE' : s.esicDeadline ? `Due ${new Date(s.esicDeadline).toLocaleDateString()}` : 'N/A'}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
