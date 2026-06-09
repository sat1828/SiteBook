import WageRun from '../models/WageRun.js';
import Site from '../models/Site.js';
import Worker from '../models/Worker.js';
import { COMPLIANCE_DEADLINES, BOCW_CESS_RATE } from '../utils/constants.js';
import { startOfMonth, endOfMonth } from '../utils/helpers.js';

const EPF_WAGE_CEILING = 15000;
const ESIC_WAGE_CEILING = 21000;

export const computeEpfEsic = (grossPay, isEligible = true) => {
  if (!isEligible || grossPay <= 0) {
    return { epfEmployer: 0, epfEmployee: 0, esicEmployer: 0, esicEmployee: 0 };
  }
  const epfWage = Math.min(grossPay, EPF_WAGE_CEILING);
  const esicWage = Math.min(grossPay, ESIC_WAGE_CEILING);
  return {
    epfEmployer: Math.round(epfWage * 0.12),
    epfEmployee: Math.round(epfWage * 0.12),
    esicEmployer: Math.round(esicWage * 0.0325),
    esicEmployee: Math.round(esicWage * 0.0075),
  };
};

export const getComplianceSummary = async (contractorId) => {
  const sites = await Site.find({ contractorId, status: 'active' }).lean();
  const now = new Date();

  // Determine which month's wages we should have filed for:
  // - If now is after the 15th, we should have filed for LAST month
  // - If now is before the 15th, the previous filing deadline is the month before last
  const prevMonth = new Date(now);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const reportMonth = prevMonth.getMonth() + 1; // 1-indexed
  const reportYear = prevMonth.getFullYear();

  const summaries = [];

  for (const site of sites) {
    const wageRun = await WageRun.findOne({
      siteId: site._id,
      month: reportMonth,
      year: reportYear,
    }).lean();

    const workerCount = await Worker.countDocuments({
      siteId: site._id,
      isActive: true,
    });

    // EPF/ESIC for wages of PREVIOUS month are due by 15th of CURRENT month
    const epfDeadline = new Date(now.getFullYear(), now.getMonth(), COMPLIANCE_DEADLINES.EPF.day);
    const esicDeadline = new Date(now.getFullYear(), now.getMonth(), COMPLIANCE_DEADLINES.ESIC.day);
    const cessDeadline = new Date(now.getFullYear(), now.getMonth(), COMPLIANCE_DEADLINES.BOCW_CESS.day);

    summaries.push({
      siteId: site._id,
      siteName: site.name,
      workerCount,
      wageRunGenerated: !!wageRun,
      wageRunStatus: wageRun?.status || null,
      totalWages: wageRun?.totalLabourCost || 0,
      epfDue: wageRun?.totalEpfEmployer || 0,
      esicDue: wageRun?.totalEsicEmployer || 0,
      cessDue: Math.round((wageRun?.totalLabourCost || 0) * BOCW_CESS_RATE),
      epfDeadline,
      esicDeadline,
      cessDeadline,
      epfOverdue: now > epfDeadline && !wageRun?.paymentReference,
      esicOverdue: now > esicDeadline && !wageRun?.paymentReference,
    });
  }

  return summaries;
};

export const getUpcomingDeadlines = async (contractorId) => {
  const summaries = await getComplianceSummary(contractorId);
  const now = new Date();
  const upcoming = [];

  for (const s of summaries) {
    if (!s.wageRunGenerated) {
      upcoming.push({
        siteName: s.siteName,
        type: 'wage_run',
        deadline: endOfMonth(new Date().getFullYear(), new Date().getMonth() + 1),
        daysRemaining: Math.ceil((endOfMonth(new Date().getFullYear(), new Date().getMonth() + 1) - now) / 86400000),
        severity: 'high',
      });
    }

    const epfDays = Math.ceil((s.epfDeadline - now) / 86400000);
    if (epfDays >= 0 && epfDays <= 7) {
      upcoming.push({
        siteName: s.siteName,
        type: 'EPF Filing',
        deadline: s.epfDeadline,
        daysRemaining: epfDays,
        amount: s.epfDue,
        severity: epfDays <= 2 ? 'critical' : 'warning',
      });
    }

    const esicDays = Math.ceil((s.esicDeadline - now) / 86400000);
    if (esicDays >= 0 && esicDays <= 7) {
      upcoming.push({
        siteName: s.siteName,
        type: 'ESIC Filing',
        deadline: s.esicDeadline,
        daysRemaining: esicDays,
        amount: s.esicDue,
        severity: esicDays <= 2 ? 'critical' : 'warning',
      });
    }
  }

  return upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);
};
