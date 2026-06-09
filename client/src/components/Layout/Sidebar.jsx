import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, HardHat, Users, ClipboardCheck, Warehouse, FileText,
  ShieldCheck, BrainCircuit, TrendingUp, X, Settings, Building2, Menu,
} from 'lucide-react';
import { useAuthStore } from '../../store/store';

const contractorLinks = [
  { to: '/contractor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contractor/sites', icon: Building2, label: 'Sites' },
  { to: '/contractor/workers', icon: Users, label: 'Workers' },
  { to: '/contractor/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/contractor/wage-runs', icon: FileText, label: 'Wage Runs' },
  { to: '/contractor/materials', icon: Warehouse, label: 'Materials' },
  { to: '/contractor/compliance', icon: ShieldCheck, label: 'Compliance' },
  { to: '/contractor/ai-insights', icon: BrainCircuit, label: 'AI Insights' },
  { to: '/contractor/reports', icon: TrendingUp, label: 'Reports' },
];

const supervisorLinks = [
  { to: '/supervisor/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/supervisor/workers', icon: Users, label: 'Workers' },
  { to: '/supervisor/materials', icon: Warehouse, label: 'Materials' },
  { to: '/supervisor/site', icon: Building2, label: 'My Site' },
];

const complianceLinks = [
  { to: '/compliance/report', icon: ShieldCheck, label: 'Compliance Report' },
  { to: '/compliance/sites', icon: Building2, label: 'Site Audits' },
  { to: '/compliance/verify', icon: ClipboardCheck, label: 'Verify Records' },
];

export const Sidebar = ({ open, onClose }) => {
  const { user } = useAuthStore();

  const links = user?.role === 'contractor' ? contractorLinks
    : user?.role === 'supervisor' ? supervisorLinks
    : user?.role === 'compliance_officer' ? complianceLinks
    : [];

  const linkClass = ({ isActive }) => clsx(
    'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
    isActive
      ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
      : 'text-text-muted hover:text-text hover:bg-[var(--glass-bg)]',
  );

  return (
    <>
      <aside className={clsx(
        'fixed top-0 left-0 z-30 h-full w-64 sidebar-bg backdrop-blur-2xl border-r',
        'flex flex-col transition-transform duration-300 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="p-5 border-b">
          <div className="flex items-center justify-between">
            <NavLink to="/" className="flex items-center gap-2.5" onClick={onClose}>
              <div className="w-8 h-8 glass rounded-lg flex items-center justify-center">
                <HardHat className="w-5 h-5 text-primary-400" />
              </div>
              <span className="font-bold text-lg">
                <span className="text-gradient">Site</span>Book
              </span>
            </NavLink>
            <button onClick={onClose} className="lg:hidden btn-ghost p-1.5 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={linkClass}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 glass rounded-full flex items-center justify-center">
              <HardHat className="w-4 h-4 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-text-muted capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
