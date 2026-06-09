import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { workers as workersApi, sites as sitesApi } from '../../api/client';

export const SupervisorWorkers = () => {
  const { data: sitesData } = useQuery({
    queryKey: ['my-sites'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  const siteIds = sitesData?.sites?.map(s => s._id) || [];

  const { data, isLoading } = useQuery({
    queryKey: ['supervisor-workers', siteIds],
    queryFn: async () => {
      const promises = siteIds.map(id => workersApi.list({ siteId: id }));
      const results = await Promise.all(promises);
      const all = results.flatMap(r => r.data.workers);
      return { workers: all };
    },
    enabled: siteIds.length > 0,
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Loading workers..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">Workers</h1>
        <p className="text-text-muted text-sm mt-1">{data?.workers?.length || 0} workers at your sites</p>
      </div>

      {!data?.workers?.length ? (
        <EmptyState title="No workers assigned" description="Workers assigned to your sites will appear here." icon={Users} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in animate-in-delay-1">
          {data.workers.map(w => (
            <GlassCard key={w._id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{w.name}</h3>
                  <p className="text-xs text-text-muted">{w.siteId?.name}</p>
                </div>
                <StatusBadge status={w.skill} label={w.skill?.replace('_', ' ')} />
              </div>
              <div className="text-sm text-text-muted space-y-1">
                <p>Rate: ₹{w.agreedRate}/day</p>
                {w.phone && <p>Phone: {w.phone}</p>}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
