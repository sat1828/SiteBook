import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AppLayout } from './components/Layout/AppLayout';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ContractorDashboard } from './pages/contractor/Dashboard';
import { ContractorSites } from './pages/contractor/Sites';
import { ContractorWorkers } from './pages/contractor/Workers';
import { ContractorAttendance } from './pages/contractor/Attendance';
import { ContractorWageRuns } from './pages/contractor/WageRuns';
import { ContractorMaterials } from './pages/contractor/Materials';
import { ContractorCompliance } from './pages/contractor/Compliance';
import { ContractorAIInsights } from './pages/contractor/AIInsights';
import { ContractorReports } from './pages/contractor/Reports';
import { SupervisorAttendance } from './pages/supervisor/Attendance';
import { SupervisorWorkers } from './pages/supervisor/Workers';
import { SupervisorMaterials } from './pages/supervisor/Materials';
import { SupervisorSite } from './pages/supervisor/Site';
import { ComplianceReport } from './pages/compliance/Report';
import { ComplianceSites } from './pages/compliance/Sites';
import { ComplianceVerify } from './pages/compliance/Verify';
import { WorkerPayslip } from './pages/worker/Payslip';
import { Unauthorized } from './pages/Unauthorized';
import { useThemeStore } from './store/store';
import { useEffect } from 'react';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 },
};

const pageTransition = { type: 'tween', ease: 'easeOut', duration: 0.2 };

const AnimatedPage = ({ children }) => (
  <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
    {children}
  </motion.div>
);

const wrap = (element) => <AnimatedPage>{element}</AnimatedPage>;

const App = () => {
  const theme = useThemeStore((s) => s.theme);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={wrap(<Login />)} />
        <Route path="/register" element={wrap(<Register />)} />
        <Route path="/unauthorized" element={wrap(<Unauthorized />)} />
        <Route path="/worker/payslip" element={wrap(<WorkerPayslip />)} />

        <Route path="/contractor" element={<AppLayout allowedRoles={['contractor']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={wrap(<ContractorDashboard />)} />
          <Route path="sites" element={wrap(<ContractorSites />)} />
          <Route path="workers" element={wrap(<ContractorWorkers />)} />
          <Route path="attendance" element={wrap(<ContractorAttendance />)} />
          <Route path="wage-runs" element={wrap(<ContractorWageRuns />)} />
          <Route path="materials" element={wrap(<ContractorMaterials />)} />
          <Route path="compliance" element={wrap(<ContractorCompliance />)} />
          <Route path="ai-insights" element={wrap(<ContractorAIInsights />)} />
          <Route path="reports" element={wrap(<ContractorReports />)} />
        </Route>

        <Route path="/supervisor" element={<AppLayout allowedRoles={['supervisor']} />}>
          <Route index element={<Navigate to="attendance" replace />} />
          <Route path="attendance" element={wrap(<SupervisorAttendance />)} />
          <Route path="workers" element={wrap(<SupervisorWorkers />)} />
          <Route path="materials" element={wrap(<SupervisorMaterials />)} />
          <Route path="site" element={wrap(<SupervisorSite />)} />
        </Route>

        <Route path="/compliance" element={<AppLayout allowedRoles={['compliance_officer']} />}>
          <Route index element={<Navigate to="report" replace />} />
          <Route path="report" element={wrap(<ComplianceReport />)} />
          <Route path="sites" element={wrap(<ComplianceSites />)} />
          <Route path="verify" element={wrap(<ComplianceVerify />)} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

export default App;
