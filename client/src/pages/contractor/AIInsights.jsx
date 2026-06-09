import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BrainCircuit, AlertTriangle, TrendingUp, MessageSquare, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/UI/GlassCard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { ai as aiApi } from '../../api/client';

export const ContractorAIInsights = () => {
  const [disputePhone, setDisputePhone] = useState('');
  const [disputeText, setDisputeText] = useState('');
  const [disputeResult, setDisputeResult] = useState(null);

  const { data: anomalies, isLoading: anomLoading } = useQuery({
    queryKey: ['anomalies'],
    queryFn: async () => { const { data } = await aiApi.anomalies(); return data; },
    refetchInterval: 60000,
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['forecast'],
    queryFn: async () => { const { data } = await aiApi.forecast(); return data; },
  });

  const disputeMutation = useMutation({
    mutationFn: () => aiApi.resolveDispute({ workerPhone: disputePhone, disputeText }),
    onSuccess: (res) => {
      setDisputeResult(res.data.result);
      toast.success('Dispute analysis complete');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Resolution failed'),
  });

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold">AI-Powered Insights</h1>
        <p className="text-text-muted text-sm mt-1">Anomaly detection, dispute resolution & budget forecasting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <GlassCard className="animate-in animate-in-delay-1">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold">Anomaly Detection</h3>
            </div>
            {anomLoading ? <LoadingSpinner /> : !anomalies?.anomalies?.length ? (
              <p className="text-text-muted text-sm">No anomalies detected. All clear.</p>
            ) : (
              <div className="space-y-2">
                {anomalies.anomalies.map((a, i) => (
                  <div key={i} className="p-3 rounded-xl bg-subtle">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={a.severity} />
                      <span className="text-sm font-medium">{a.type?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-text-muted">{a.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="animate-in animate-in-delay-2">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary-400" />
              <h3 className="font-semibold">Wage Dispute Resolution</h3>
            </div>
            <div className="space-y-3">
              <input value={disputePhone} onChange={(e) => setDisputePhone(e.target.value)} className="input-field" placeholder="Worker phone (e.g., +919876543210)" />
              <textarea value={disputeText} onChange={(e) => setDisputeText(e.target.value)} className="input-field min-h-[80px]" placeholder="Describe the dispute..." rows={3} />
              <Button onClick={() => disputeMutation.mutate()} loading={disputeMutation.isPending} className="w-full">
                <Send className="w-4 h-4 mr-1.5" /> Resolve Dispute
              </Button>
              {disputeResult && (
                <div className="p-3 rounded-xl bg-subtle text-sm space-y-2">
                  <p className="font-medium text-accent-400">Resolution:</p>
                  <p className="text-text-muted whitespace-pre-wrap">{disputeResult.analysis || disputeResult.mockResult || 'Records analysed.'}</p>
                  {disputeResult.worker && (
                    <p className="text-xs text-text-muted">Worker: {disputeResult.worker.name} | Rate: ₹{disputeResult.worker.agreedRate}</p>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="animate-in animate-in-delay-3">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-accent-400" />
              <h3 className="font-semibold">Budget Forecast</h3>
            </div>
            {forecastLoading ? <LoadingSpinner /> : !forecast?.forecasts?.length ? (
              <p className="text-text-muted text-sm">Insufficient data. Generate at least 3 months of wage runs.</p>
            ) : (
              <div className="space-y-3">
                {forecast.forecasts.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-subtle">
                    <h4 className="font-medium text-sm mb-1">{f.siteName}</h4>
                    <div className="flex gap-4 text-xs text-text-muted mb-2">
                      <span>Avg/month: ₹{(f.avgMonthlyCost || 0).toLocaleString()}</span>
                      <span>Budget left: ₹{(f.budgetRemaining || 0).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-text-muted">{f.forecast}</p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="animate-in animate-in-delay-4">
            <div className="flex items-center gap-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-primary-400" />
              <h3 className="font-semibold">Claude AI Agent</h3>
            </div>
            <p className="text-sm text-text-muted">
              The AI dispute resolution agent analyses real attendance and wage records from your MongoDB database.
              It cross-references attendance logs, agreed wage rates, and payment history to resolve worker disputes.
              Anomaly detection runs nightly to flag potential violations.
            </p>
            <div className="mt-3 p-3 rounded-xl bg-primary-500/5 border border-primary-500/10 text-xs text-text-muted">
              Note: Set <code className="text-primary-400">CLAUDE_API_KEY</code> in your environment for live AI responses. Without it, mock results are shown.
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
