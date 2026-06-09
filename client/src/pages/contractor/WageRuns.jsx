import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, CheckCircle, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
import { DataTable } from '../../components/UI/DataTable';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { wageRuns as wrApi, sites as sitesApi } from '../../api/client';

export const ContractorWageRuns = () => {
  const queryClient = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedWr, setSelectedWr] = useState(null);
  const [genForm, setGenForm] = useState({ siteId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const { data, isLoading } = useQuery({
    queryKey: ['wageRuns'],
    queryFn: async () => { const { data } = await wrApi.list(); return data; },
  });

  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  const generateMutation = useMutation({
    mutationFn: () => wrApi.generate(genForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wageRuns'] });
      setShowGenerate(false);
      toast.success('Wage run generated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Generation failed'),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => wrApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wageRuns'] });
      toast.success('Wage run approved');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Approval failed'),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id) => wrApi.markPaid(id, { paymentReference: `PAID-${Date.now()}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wageRuns'] });
      toast.success('Marked as paid & WhatsApp notifications sent');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const downloadMuster = async (id) => {
    try {
      const res = await wrApi.musterRoll(id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'muster-roll.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const columns = [
    { header: 'Site', render: (r) => r.siteId?.name || '—' },
    { header: 'Period', render: (r) => `${r.month}/${r.year}` },
    { header: 'Workers', render: (r) => r.workers?.length || 0 },
    { header: 'Total Cost', render: (r) => `₹${(r.totalLabourCost || 0).toLocaleString()}` },
    { header: 'Net Payable', render: (r) => `₹${(r.totalNetPayable || 0).toLocaleString()}` },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { header: 'Actions', render: (r) => (
      <div className="flex gap-1">
        {r.status === 'draft' && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); approveMutation.mutate(r._id); }}><CheckCircle className="w-3.5 h-3.5" /></Button>}
        {r.status === 'approved' && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); markPaidMutation.mutate(r._id); }}><DollarSign className="w-3.5 h-3.5" /></Button>}
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); downloadMuster(r._id); }}><Download className="w-3.5 h-3.5" /></Button>
      </div>
    )},
  ];

  if (isLoading) return <LoadingSpinner size="lg" text="Loading wage runs..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-2xl font-bold">Wage Runs</h1>
          <p className="text-text-muted text-sm mt-1">{data?.wageRuns?.length || 0} runs</p>
        </div>
        <Button onClick={() => setShowGenerate(true)}><FileText className="w-4 h-4 mr-1.5" /> Generate</Button>
      </div>

      {!data?.wageRuns?.length ? (
        <EmptyState title="No wage runs yet" description="Generate your first monthly wage run from attendance data." action={<Button onClick={() => setShowGenerate(true)}><FileText className="w-4 h-4 mr-1.5" /> Generate Wage Run</Button>} />
      ) : (
        <div className="animate-in animate-in-delay-1">
          <DataTable columns={columns} data={data.wageRuns} />
        </div>
      )}

      {selectedWr && (
        <Modal isOpen={!!selectedWr} onClose={() => setSelectedWr(null)} title={`Wage Run Detail`} size="lg">
          <pre className="text-xs text-text-muted max-h-96 overflow-auto">{JSON.stringify(selectedWr, null, 2)}</pre>
        </Modal>
      )}

      <Modal isOpen={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Wage Run">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Site</label>
            <select value={genForm.siteId} onChange={(e) => setGenForm({ ...genForm, siteId: e.target.value })} className="select-field" required>
              <option value="">Select site...</option>
              {sitesData?.sites?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Month</label>
              <select value={genForm.month} onChange={(e) => setGenForm({ ...genForm, month: parseInt(e.target.value) })} className="select-field">
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Year</label>
              <input type="number" value={genForm.year} onChange={(e) => setGenForm({ ...genForm, year: parseInt(e.target.value) })} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>Generate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
