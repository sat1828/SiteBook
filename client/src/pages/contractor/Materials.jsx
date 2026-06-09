import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
import { DataTable } from '../../components/UI/DataTable';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { materials as matApi, sites as sitesApi } from '../../api/client';

export const ContractorMaterials = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showTransact, setShowTransact] = useState(null);
  const [siteFilter, setSiteFilter] = useState('');
  const [form, setForm] = useState({ siteId: '', name: '', unit: 'bags', currentStock: 0, lowStockThreshold: 10 });
  const [txForm, setTxForm] = useState({ type: 'inward', quantity: '', rate: '', supplier: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['materials', siteFilter],
    queryFn: async () => { const { data } = await matApi.list({ siteId: siteFilter || undefined }); return data; },
  });

  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  const createMutation = useMutation({
    mutationFn: (d) => matApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setShowCreate(false); toast.success('Material added'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const transactMutation = useMutation({
    mutationFn: ({ id, d }) => matApi.addTransaction(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setShowTransact(null); toast.success('Transaction recorded'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const columns = [
    { header: 'Material', render: (r) => r.name },
    { header: 'Site', render: (r) => r.siteId?.name || '—' },
    { header: 'Unit', render: (r) => r.unit?.replace('_', ' ') },
    { header: 'Stock', render: (r) => (
      <span className={r.isLowStock ? 'text-red-400 font-semibold' : ''}>
        {r.currentStock} {r.isLowStock && <AlertTriangle className="w-3 h-3 inline" />}
      </span>
    )},
    { header: 'Inward', render: (r) => r.totalInward || 0 },
    { header: 'Outward', render: (r) => r.totalOutward || 0 },
    { header: 'Wastage', render: (r) => `${(Number(r.wastagePercent) || 0).toFixed(1)}%` },
    { header: 'Actions', render: (r) => (
      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setShowTransact(r._id); }}>
        <TrendingUp className="w-3.5 h-3.5" />
      </Button>
    )},
  ];

  if (isLoading) return <LoadingSpinner size="lg" text="Loading materials..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in">
        <div>
          <h1 className="text-2xl font-bold">Material Issue Register</h1>
          <p className="text-text-muted text-sm mt-1">{data?.materials?.length || 0} materials tracked</p>
        </div>
        <div className="flex gap-2">
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="select-field text-sm py-2">
            <option value="">All Sites</option>
            {sitesData?.sites?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Material</Button>
        </div>
      </div>

      {data?.materials?.filter(m => m.isLowStock)?.length > 0 && (
        <div className="animate-in animate-in-delay-1">
          <GlassCard className="border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <h3 className="font-semibold text-sm">Low Stock Alerts</h3>
            </div>
            <div className="space-y-1">
              {data.materials.filter(m => m.isLowStock).map(m => (
                <p key={m._id} className="text-sm text-text-muted">{m.name} @ {m.siteId?.name}: {m.currentStock} {m.unit} remaining</p>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {!data?.materials?.length ? (
        <EmptyState title="No materials tracked" description="Add materials to start tracking inventory at your sites." action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Material</Button>} />
      ) : (
        <div className="animate-in animate-in-delay-2"><DataTable columns={columns} data={data.materials} /></div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Material">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Material Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Site</label>
            <select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className="select-field" required>
              <option value="">Select site...</option>
              {sitesData?.sites?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="select-field">
                <option value="bags">Bags</option><option value="kg">Kg</option><option value="tonnes">Tonnes</option>
                <option value="units">Units</option><option value="pieces">Pieces</option><option value="litres">Litres</option>
                <option value="truckload">Truckload</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Initial Stock</label>
              <input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: parseInt(e.target.value) })} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Add Material</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!showTransact} onClose={() => setShowTransact(null)} title="Record Transaction">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Type</label>
            <div className="flex gap-2">
              <Button variant={txForm.type === 'inward' ? 'primary' : 'secondary'} size="sm" onClick={() => setTxForm({ ...txForm, type: 'inward' })}><ArrowDown className="w-3.5 h-3.5 mr-1" /> Inward</Button>
              <Button variant={txForm.type === 'outward' ? 'primary' : 'secondary'} size="sm" onClick={() => setTxForm({ ...txForm, type: 'outward' })}><ArrowUp className="w-3.5 h-3.5 mr-1" /> Outward</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Quantity</label>
              <input type="number" value={txForm.quantity} onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Rate (₹)</label>
              <input type="number" value={txForm.rate} onChange={(e) => setTxForm({ ...txForm, rate: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Supplier</label>
            <input value={txForm.supplier} onChange={(e) => setTxForm({ ...txForm, supplier: e.target.value })} className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowTransact(null)}>Cancel</Button>
              <Button onClick={() => transactMutation.mutate({ id: showTransact, d: { ...txForm, quantity: Number(txForm.quantity), rate: txForm.rate ? Number(txForm.rate) : undefined } })} loading={transactMutation.isPending}>Record</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
