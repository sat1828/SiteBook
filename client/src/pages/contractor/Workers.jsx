import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
import { DataTable } from '../../components/UI/DataTable';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { workers as workersApi, sites as sitesApi } from '../../api/client';

export const ContractorWorkers = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', skill: 'unskilled', siteId: '', agreedRate: '' });
  const [siteFilter, setSiteFilter] = useState('');

  const { data: workersData, isLoading } = useQuery({
    queryKey: ['workers', siteFilter],
    queryFn: async () => { const { data } = await workersApi.list({ siteId: siteFilter || undefined }); return data; },
  });

  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  const createMutation = useMutation({
    mutationFn: (workerData) => workersApi.create(workerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setShowCreate(false);
      toast.success('Worker added');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add worker'),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...form, agreedRate: Number(form.agreedRate) });
  };

  const columns = [
    { header: 'Name', render: (r) => r.name },
    { header: 'Skill', render: (r) => <StatusBadge status={r.skill} label={r.skill?.replace('_', ' ')} /> },
    { header: 'Site', render: (r) => r.siteId?.name || '—' },
    { header: 'Rate', render: (r) => `₹${r.agreedRate}` },
    { header: 'Phone', render: (r) => r.phone || '—' },
    { header: 'Status', render: (r) => <StatusBadge status={r.isActive} label={r.isActive ? 'Active' : 'Inactive'} /> },
  ];

  if (isLoading) return <LoadingSpinner size="lg" text="Loading workers..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in">
        <div>
          <h1 className="text-2xl font-bold">Workers</h1>
          <p className="text-text-muted text-sm mt-1">{workersData?.workers?.length || 0} workers</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="select-field text-sm py-2">
            <option value="">All Sites</option>
            {sitesData?.sites?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Worker</Button>
        </div>
      </div>

      {(!workersData?.workers || workersData.workers.length === 0) ? (
        <EmptyState title="No workers added" description="Add workers to your sites to track attendance and wages." action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Worker</Button>} />
      ) : (
        <div className="animate-in animate-in-delay-1">
          <DataTable columns={columns} data={workersData.workers} />
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Worker">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Worker Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+919876543210" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Skill Category</label>
            <select value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} className="select-field">
              <option value="unskilled">Unskilled</option>
              <option value="semi_skilled">Semi-Skilled</option>
              <option value="skilled">Skilled</option>
              <option value="highly_skilled">Highly Skilled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Site</label>
            <select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className="select-field" required>
              <option value="">Select site...</option>
              {sitesData?.sites?.filter(s => s.status === 'active').map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Agreed Daily Rate (₹)</label>
            <input type="number" value={form.agreedRate} onChange={(e) => setForm({ ...form, agreedRate: e.target.value })} className="input-field" required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Add Worker</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
