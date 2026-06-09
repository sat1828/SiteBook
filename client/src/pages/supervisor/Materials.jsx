import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/UI/GlassCard';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { materials as matApi, sites as sitesApi } from '../../api/client';

export const SupervisorMaterials = () => {
  const queryClient = useQueryClient();
  const [selectedSite, setSelectedSite] = useState('');
  const [showTx, setShowTx] = useState(null);
  const [txForm, setTxForm] = useState({ type: 'inward', quantity: '', notes: '' });

  const { data: sitesData } = useQuery({
    queryKey: ['my-sites'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['materials-supervisor', selectedSite],
    queryFn: async () => { const { data } = await matApi.list({ siteId: selectedSite || undefined }); return data; },
    enabled: !!selectedSite,
  });

  const txMutation = useMutation({
    mutationFn: ({ id, d }) => matApi.addTransaction(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials-supervisor'] }); setShowTx(null); toast.success('Recorded'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Loading materials..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">Material Log</h1>
        <p className="text-text-muted text-sm mt-1">Record material usage at your site</p>
      </div>

      <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} className="select-field sm:w-72 animate-in">
        <option value="">Select your site...</option>
        {sitesData?.sites?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>

      {!selectedSite ? (
        <EmptyState title="Select a site" description="Choose your site to view materials." />
      ) : !data?.materials?.length ? (
        <EmptyState title="No materials" description="No materials are being tracked at this site yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in animate-in-delay-1">
          {data.materials.map(m => (
            <GlassCard key={m._id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{m.name}</h3>
                  <p className="text-xs text-text-muted">{m.unit?.replace('_', ' ')}</p>
                </div>
                <span className={`text-lg font-bold ${m.currentStock <= m.lowStockThreshold ? 'text-red-400' : 'text-accent-400'}`}>
                  {m.currentStock}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setTxForm({ type: 'inward', quantity: '', notes: '' }); setShowTx(m._id); }}>
                  <ArrowDown className="w-3.5 h-3.5 mr-1" /> Inward
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setTxForm({ type: 'outward', quantity: '', notes: '' }); setShowTx(m._id); }}>
                  <ArrowUp className="w-3.5 h-3.5 mr-1" /> Outward
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal isOpen={!!showTx} onClose={() => setShowTx(null)} title="Record Transaction">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={txForm.type === 'inward' ? 'primary' : 'secondary'} size="sm" onClick={() => setTxForm({ ...txForm, type: 'inward' })}>Inward</Button>
            <Button variant={txForm.type === 'outward' ? 'primary' : 'secondary'} size="sm" onClick={() => setTxForm({ ...txForm, type: 'outward' })}>Outward</Button>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Quantity</label>
            <input type="number" value={txForm.quantity} onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Notes</label>
            <input value={txForm.notes} onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })} className="input-field" />
          </div>
          <Button onClick={() => txMutation.mutate({ id: showTx, d: { ...txForm, quantity: Number(txForm.quantity) } })} loading={txMutation.isPending} className="w-full">Record</Button>
        </div>
      </Modal>
    </div>
  );
};
