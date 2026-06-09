import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Users, ClipboardCheck, FileText, TrendingUp, AlertTriangle,
  DollarSign, HardHat, ArrowUpRight,
} from 'lucide-react';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { compliance, wageRuns as wrApi, sites as sitesApi } from '../../api/client';
import { useAuthStore } from '../../store/store';

const StatCard = ({ icon: Icon, label, value, sub, color = 'primary', link }) => {
  const colors = {
    primary: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
    accent: 'text-accent-400 bg-accent-500/10 border-accent-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  const content = (
    <GlassCard hover className="relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {sub && <p className="text-xs text-text-muted">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {link && (
        <div className="mt-3 flex items-center gap-1 text-xs text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
          View details <ArrowUpRight className="w-3 h-3" />
        </div>
      )}
    </GlassCard>
  );

  return link ? <Link to={link}>{content}</Link> : content;
};

export const ContractorDashboard = () => {
  const { user } = useAuthStore();

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await compliance.dashboard();
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: deadlines } = useQuery({
    queryKey: ['deadlines'],
    queryFn: async () => {
      const { data } = await compliance.deadlines();
      return data;
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Loading dashboard..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-text-muted mt-1">Here's your construction overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in animate-in-delay-1">
        <StatCard icon={Building2} label="Active Sites" value={dashData?.activeSites || 0} sub={`of ${dashData?.totalSites || 0} total`} color="primary" link="/contractor/sites" />
        <StatCard icon={Users} label="Total Workers" value={dashData?.totalWorkers || 0} sub="Active across all sites" color="accent" />
        <StatCard icon={DollarSign} label="Labour Cost (MTD)" value={`₹${(dashData?.totalLabourCost || 0).toLocaleString()}`} color="yellow" />
        <StatCard icon={TrendingUp} label="Net Paid" value={`₹${(dashData?.totalNetPaid || 0).toLocaleString()}`} color="accent" />
      </div>

      {deadlines?.deadlines?.length > 0 && (
        <div className="animate-in animate-in-delay-2">
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold">Upcoming Compliance Deadlines</h3>
            </div>
            <div className="space-y-2">
              {deadlines.deadlines.slice(0, 5).map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-subtle">
                  <div>
                    <p className="text-sm font-medium">{d.type} — {d.siteName}</p>
                    <p className="text-xs text-text-muted">Due: {new Date(d.deadline).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={d.severity} label={`${d.daysRemaining}d left`} />
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in animate-in-delay-3">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Monthly Labour Cost Trend</h3>
          </div>
          {dashData?.monthlyTrend?.length > 0 ? (
            <div className="space-y-3">
              {dashData.monthlyTrend.map((m, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm text-text-muted w-16">{m.label}</span>
                  <div className="flex-1 h-3 bg-progress-track rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((m.totalCost / (dashData.monthlyTrend.reduce((s, x) => Math.max(s, x.totalCost), 1))) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-24 text-right">₹{(m.totalCost || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">No wage run data yet. Generate your first wage run.</p>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/contractor/attendance" className="glass rounded-xl p-4 text-center bg-subtle-hover transition-all">
              <ClipboardCheck className="w-6 h-6 text-primary-400 mx-auto mb-2" />
              <span className="text-sm">View Attendance</span>
            </Link>
            <Link to="/contractor/wage-runs" className="glass rounded-xl p-4 text-center bg-subtle-hover transition-all">
              <FileText className="w-6 h-6 text-accent-400 mx-auto mb-2" />
              <span className="text-sm">Generate Wage Run</span>
            </Link>
            <Link to="/contractor/compliance" className="glass rounded-xl p-4 text-center bg-subtle-hover transition-all">
              <HardHat className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <span className="text-sm">Compliance</span>
            </Link>
            <Link to="/contractor/materials" className="glass rounded-xl p-4 text-center bg-subtle-hover transition-all">
              <TrendingUp className="w-6 h-6 text-primary-400 mx-auto mb-2" />
              <span className="text-sm">Materials</span>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
