import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HardHat, Loader2, Download } from 'lucide-react';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Button } from '../../components/UI/Button';
import { workerPortal as wpApi, wageRuns as wrApi } from '../../api/client';

export const WorkerPayslip = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No payslip token provided. Use the link from your WhatsApp message.');
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const { data: res } = await wpApi.viewPayslip(token);
        setData(res.payslip);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load payslip. The link may be expired.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  const downloadPdf = async () => {
    if (!data) return;
    try {
      const res = await wrApi.wageSlip(data.wageRunId || 'none', data.workerId || 'none');
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = `wageslip-${data.month}-${data.year}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400 mx-auto mb-3" />
          <p className="text-text-muted">Loading your wage slip...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full text-center">
          <HardHat className="w-12 h-12 text-primary-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">SiteBook</h2>
          <p className="text-text-muted text-sm">{error}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <GlassCard className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center mx-auto mb-3">
            <HardHat className="w-6 h-6 text-primary-400" />
          </div>
          <h2 className="text-xl font-bold">Wage Slip</h2>
          <p className="text-text-muted text-sm">{data.siteName}</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-text-muted">Worker</span>
            <span className="font-medium">{data.workerName}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-text-muted">Period</span>
            <span className="font-medium">{data.month}/{data.year}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-text-muted">Full Days</span>
            <span className="font-medium">{data.fullDays || 0}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-text-muted">Half Days</span>
            <span className="font-medium">{data.halfDays || 0}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-text-muted">OT Hours</span>
            <span className="font-medium">{data.totalOvertimeHours || 0}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-text-muted">Daily Rate</span>
            <span className="font-medium">₹{data.dailyRate || 0}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-text-muted">Base Pay</span>
            <span className="font-medium">₹{Math.round(data.basePay || 0)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-text-muted">Overtime Pay</span>
            <span className="font-medium">₹{Math.round(data.overtimePay || 0)}</span>
          </div>
          <div className="flex justify-between py-3 border-t text-base">
            <span className="font-semibold">Net Payable</span>
            <span className="font-bold text-accent-400">₹{Math.round(data.netPayable || 0)}</span>
          </div>
        </div>

        <Button onClick={downloadPdf} variant="secondary" className="w-full mt-4">
          <Download className="w-4 h-4 mr-1.5" /> Download PDF
        </Button>

        <p className="text-xs text-text-muted text-center mt-4">
          Powered by SiteBook — Construction Labour OS
        </p>
      </GlassCard>
    </div>
  );
};
