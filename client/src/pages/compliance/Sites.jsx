import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin } from 'lucide-react';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { sites as sitesApi } from '../../api/client';

export const ComplianceSites = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['comp-sites'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Loading sites..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">Site Audits</h1>
        <p className="text-text-muted text-sm mt-1">Review site compliance status</p>
      </div>

      {!data?.sites?.length ? (
        <EmptyState title="No sites to audit" icon={Building2} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in animate-in-delay-1">
          {data.sites.map(site => (
            <GlassCard key={site._id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{site.name}</h3>
                  <StatusBadge status={site.status} />
                </div>
              </div>
              {site.location?.coordinates && (
                <p className="text-xs text-text-muted flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {site.location.coordinates[1]?.toFixed(4)}, {site.location.coordinates[0]?.toFixed(4)}
                </p>
              )}
              <div className="mt-2 text-xs text-text-muted">
                <p>Wage rates: {site.wageRates?.length} tiers</p>
                <p>Supervisors: {site.supervisors?.length || 0}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
