import cron from 'node-cron';
import { getComplianceSummary } from '../services/complianceService.js';
import { runAnomalyDetection } from '../services/aiService.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

export const startCronJobs = () => {
  // Daily compliance deadline check at 8 AM IST
  cron.schedule('30 2 * * *', async () => {
    console.log('[Cron] Running compliance deadline check...');
    try {
      const contractors = await User.find({ role: 'contractor', isActive: true }).lean();
      for (const contractor of contractors) {
        const summaries = await getComplianceSummary(contractor._id);
        const now = new Date();

        for (const s of summaries) {
          if (s.epfDeadline && !s.epfOverdue) {
            const daysDiff = Math.ceil((s.epfDeadline - now) / 86400000);
            if (daysDiff === 7) {
              await Notification.create({
                userId: contractor._id,
                contractorId: contractor._id,
                type: 'compliance_deadline',
                title: 'EPF Deadline in 7 Days',
                message: `${s.siteName}: EPF of ₹${s.epfDue} due in 7 days`,
                severity: 'warning',
                link: '/contractor/compliance',
              });
            }
          }

          if (s.esicDeadline && !s.esicOverdue) {
            const daysDiff = Math.ceil((s.esicDeadline - now) / 86400000);
            if (daysDiff === 7) {
              await Notification.create({
                userId: contractor._id,
                contractorId: contractor._id,
                type: 'compliance_deadline',
                title: 'ESIC Deadline in 7 Days',
                message: `${s.siteName}: ESIC of ₹${s.esicDue} due in 7 days`,
                severity: 'warning',
                link: '/contractor/compliance',
              });
            }
          }

          if (s.epfOverdue) {
            await Notification.create({
              userId: contractor._id,
              contractorId: contractor._id,
              type: 'compliance_deadline',
              title: 'EPF Deadline Overdue',
              message: `${s.siteName}: EPF of ₹${s.epfDue} is overdue`,
              severity: 'critical',
              link: '/contractor/compliance',
            });
          }

          if (s.esicOverdue) {
            await Notification.create({
              userId: contractor._id,
              contractorId: contractor._id,
              type: 'compliance_deadline',
              title: 'ESIC Deadline Overdue',
              message: `${s.siteName}: ESIC of ₹${s.esicDue} is overdue`,
              severity: 'critical',
              link: '/contractor/compliance',
            });
          }
        }
      }
      console.log('[Cron] Compliance check complete.');
    } catch (error) {
      console.error('[Cron] Compliance check error:', error.message);
    }
  });

  // Nightly anomaly detection at 2 AM IST
  cron.schedule('30 20 * * *', async () => {
    console.log('[Cron] Running anomaly detection...');
    try {
      const contractors = await User.find({ role: 'contractor', isActive: true }).lean();
      for (const contractor of contractors) {
        const anomalies = await runAnomalyDetection(contractor._id);
        if (anomalies.length > 0) {
          for (const a of anomalies) {
            await Notification.create({
              userId: contractor._id,
              contractorId: contractor._id,
              type: 'anomaly',
              title: `[${a.severity}] ${a.type} Anomaly`,
              message: a.detail,
              severity: a.severity === 'high' ? 'critical' : 'warning',
              link: '/contractor/ai-insights',
            });
          }
        }
      }
      console.log('[Cron] Anomaly detection complete.');
    } catch (error) {
      console.error('[Cron] Anomaly detection error:', error.message);
    }
  });

  console.log('Cron jobs started.');
};
