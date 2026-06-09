import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { sites as sitesApi } from '../../api/client';

export const ContractorSites = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    lat: '',
    lng: '',
    radius: 200,
    budget: '',
    wageRates: [
      { skill: 'unskilled', dailyRate: 350, overtimeRateMultiplier: 1.5 },
      { skill: 'semi_skilled', dailyRate: 450, overtimeRateMultiplier: 1.5 },
      { skill: 'skilled', dailyRate: 550, overtimeRateMultiplier: 1.5 },
      { skill: 'highly_skilled', dailyRate: 750, overtimeRateMultiplier: 1.5 },
    ],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  const createMutation = useMutation({
    mutationFn: (siteData) => sitesApi.create(siteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setShowCreate(false);
      toast.success('Site created successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create site'),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({
      name: form.name,
      location: {
        type: 'Point',
        coordinates: [parseFloat(form.lng), parseFloat(form.lat)],
      },
      radius: parseInt(form.radius),
      budget: parseFloat(form.budget) || 0,
      wageRates: form.wageRates,
    });
  };

  if (isLoading) return <LoadingSpinner size="lg" text="Loading sites..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-2xl font-bold">Construction Sites</h1>
          <p className="text-text-muted text-sm mt-1">{data?.sites?.length || 0} sites</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> New Site</Button>
      </div>

      {(!data?.sites || data.sites.length === 0) ? (
        <EmptyState title="No sites yet" description="Create your first construction site to start managing workers and attendance." action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> Create Site</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in animate-in-delay-1">
          {data.sites.map((site) => (
            <GlassCard key={site._id} hover className="relative group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{site.name}</h3>
                  <StatusBadge status={site.status} />
                </div>
                <button className="btn-ghost p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-text-muted">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{site.location?.coordinates?.[1]?.toFixed(4)}, {site.location?.coordinates?.[0]?.toFixed(4)}</span>
                </div>
                {site.budget > 0 && (
                  <p className="text-text-muted">Budget: <span className="text-text font-medium">₹{site.budget.toLocaleString()}</span></p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-text-muted">
                  {site.wageRates?.map(w => `${w.skill.replace('_', ' ')}: ₹${w.dailyRate}`).join(' | ')}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Site" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Site Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Latitude</label>
              <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Longitude</label>
              <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} className="input-field" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Geo-validation Radius (metres)</label>
            <input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Budget (optional)</label>
            <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Wage Rates</label>
            <div className="space-y-2">
              {form.wageRates.map((wr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-text-muted w-28 capitalize">{wr.skill.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-text-muted">₹</span>
                  <input type="number" value={wr.dailyRate} onChange={(e) => {
                    const newRates = [...form.wageRates];
                    newRates[i].dailyRate = parseFloat(e.target.value) || 0;
                    setForm({ ...form, wageRates: newRates });
                  }} className="input-field w-24" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create Site</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
