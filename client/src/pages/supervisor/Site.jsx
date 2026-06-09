import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, DollarSign, Users } from 'lucide-react';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { sites as sitesApi } from '../../api/client';

export const SupervisorSite = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-sites-detail'],
    queryFn: async () => { const { data } = await sitesApi.list(); return data; },
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Loading site info..." className="min-h-[60vh]" />;

  const site = data?.sites?.[0];

  if (!site) return <EmptyState title="No site assigned" description="You haven't been assigned to any site yet." />;

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">{site.name}</h1>
        <StatusBadge status={site.status} className="mt-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in animate-in-delay-1">
        <GlassCard>
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold">Location</h3>
          </div>
          {site.location?.coordinates ? (
            <p className="text-sm text-text-muted">
              {site.location.coordinates[1]?.toFixed(6)}, {site.location.coordinates[0]?.toFixed(6)}
              <br />
              <span className="text-xs">Radius: {site.radius || site.location?.radius || 200}m</span>
            </p>
          ) : <p className="text-sm text-text-muted">No coordinates set</p>}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-accent-400" />
            <h3 className="font-semibold">Wage Rates</h3>
          </div>
          <div className="space-y-1">
            {site.wageRates?.map((wr, i) => (
              <p key={i} className="text-sm text-text-muted capitalize">
                {wr.skill.replace('_', ' ')}: <span className="text-text font-medium">₹{wr.dailyRate}/day</span>
              </p>
            ))}
          </div>
        </GlassCard>

        {site.budget > 0 && (
          <GlassCard>
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold">Project Budget</h3>
            </div>
            <p className="text-2xl font-bold">₹{site.budget.toLocaleString()}</p>
          </GlassCard>
        )}

        <GlassCard>
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold">Site Info</h3>
          </div>
          <div className="text-sm text-text-muted space-y-1">
            <p>Created: {new Date(site.createdAt).toLocaleDateString()}</p>
            <p>Supervisors: {site.supervisors?.length || 0} assigned</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
