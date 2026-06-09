import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, BarChart3, PieChart } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/UI/GlassCard';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { wageRuns as wrApi, compliance as compApi } from '../../api/client';

export const ContractorReports = () => {
  const { data: wrData, isLoading } = useQuery({
    queryKey: ['wageRuns'],
    queryFn: async () => { const { data } = await wrApi.list(); return data; },
  });

  const { data: dashData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => { const { data } = await compApi.dashboard(); return data; },
  });

  const downloadMuster = async (id, name) => {
    try {
      const res = await wrApi.musterRoll(id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = `muster-${name}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  if (isLoading) return <LoadingSpinner size="lg" text="Loading reports..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">Reports & Exports</h1>
        <p className="text-text-muted text-sm mt-1">Download statutory reports and view analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in animate-in-delay-1">
        <GlassCard hover>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 glass rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold">BOCW Muster Roll</h3>
              <p className="text-xs text-text-muted">Legally prescribed format</p>
            </div>
          </div>
          <p className="text-sm text-text-muted mb-3">Download the muster roll in the format required by labour inspectors under the BOCW Act.</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {wrData?.wageRuns?.filter(w => w.status !== 'draft').map(w => (
              <button key={w._id} onClick={() => downloadMuster(w._id, w.siteId?.name)} className="text-xs text-primary-400 hover:text-primary-300 block w-full text-left py-1">
                {w.siteId?.name} — {w.month}/{w.year}
              </button>
            ))}
            {(!wrData?.wageRuns || wrData.wageRuns.length === 0) && <p className="text-xs text-text-muted">No approved wage runs yet.</p>}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 glass rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h3 className="font-semibold">Cost Dashboard</h3>
              <p className="text-xs text-text-muted">Labour vs budget</p>
            </div>
          </div>
          {dashData?.monthlyTrend?.length > 0 ? (
            <div className="space-y-2">
              {dashData.monthlyTrend.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-text-muted w-14">{m.label}</span>
                  <div className="flex-1 h-2 bg-progress-track rounded-full overflow-hidden">
                    <div className="h-full bg-accent-500 rounded-full" style={{ width: `${Math.min((m.totalCost / (dashData.monthlyTrend.reduce((s, x) => Math.max(s, x.totalCost), 1))) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs text-text-muted w-20 text-right">₹{(m.totalCost || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-text-muted">No data yet.</p>}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 glass rounded-xl flex items-center justify-center">
              <PieChart className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold">EPF/ESIC Export</h3>
              <p className="text-xs text-text-muted">ECR file format</p>
            </div>
          </div>
          <p className="text-sm text-text-muted mb-3">Export monthly EPF/ESIC contribution data in the ECR format for EPFO portal upload.</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {wrData?.wageRuns?.filter(w => w.status === 'paid').map(w => (
              <button key={w._id} onClick={async () => {
                try {
                  const { data } = await wrApi.ecr(w._id);
                  const ecrData = data?.ecr || { error: 'No ECR data available' };
                  const blob = new Blob([JSON.stringify(ecrData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `ecr-${w.month}-${w.year}.json`; a.click();
                  URL.revokeObjectURL(url);
                  toast.success('ECR data exported');
                } catch { toast.error('Export failed'); }
              }} className="text-xs text-accent-400 hover:text-accent-300 block w-full text-left py-1">
                {w.siteId?.name} — {w.month}/{w.year}
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
