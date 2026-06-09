import { getComplianceSummary, getUpcomingDeadlines } from '../services/complianceService.js';
import WageRun from '../models/WageRun.js';
import Site from '../models/Site.js';
import Worker from '../models/Worker.js';

const getEffectiveContractorId = (user) =>
  user.role === 'contractor' ? user._id : user.contractorId;

export const getComplianceReport = async (req, res, next) => {
  try {
    const cId = getEffectiveContractorId(req.user);
    if (!cId) return res.status(400).json({ error: 'No contractor association found' });
    const summary = await getComplianceSummary(cId);
    res.json({ summary });
  } catch (error) {
    next(error);
  }
};

export const getDeadlines = async (req, res, next) => {
  try {
    const cId = getEffectiveContractorId(req.user);
    if (!cId) return res.status(400).json({ error: 'No contractor association found' });
    const deadlines = await getUpcomingDeadlines(cId);
    res.json({ deadlines });
  } catch (error) {
    next(error);
  }
};

export const getSiteCompliance = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const site = await Site.findById(siteId).lean();
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const cId = getEffectiveContractorId(req.user);
    if (cId && String(site.contractorId) !== String(cId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const wageRuns = await WageRun.find({ siteId }).sort({ year: -1, month: -1 }).lean();

    res.json({
      site,
      wageRuns,
      summary: {
        totalWageRuns: wageRuns.length,
        approvedRuns: wageRuns.filter(w => w.status === 'approved').length,
        paidRuns: wageRuns.filter(w => w.status === 'paid').length,
        totalLabourCost: wageRuns.reduce((s, w) => s + w.totalLabourCost, 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const getDashboardStats = async (req, res, next) => {
  try {
    const cId = getEffectiveContractorId(req.user);
    if (!cId) return res.status(400).json({ error: 'No contractor association found' });

    const fromYear = parseInt(req.query.fromYear) || 0;
    const wageFilter = { contractorId: cId };
    if (fromYear > 0) wageFilter.year = { $gte: fromYear };

    const sites = await Site.find({ contractorId: cId }).lean();
    const wageRuns = await WageRun.find(wageFilter).lean();

    const totalSites = sites.length;
    const activeSites = sites.filter(s => s.status === 'active').length;
    const totalWageRuns = wageRuns.length;
    const totalLabourCost = wageRuns.reduce((s, w) => s + w.totalLabourCost, 0);
    const totalNetPaid = wageRuns.filter(w => w.status === 'paid').reduce((s, w) => s + w.totalNetPayable, 0);

    // Real total worker count across all sites
    const siteIds = sites.map(s => s._id);
    const totalWorkers = await Worker.countDocuments({ siteId: { $in: siteIds }, isActive: true });

    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() - i, 1));
      const m = d.getUTCMonth();
      const y = d.getUTCFullYear();

      const filtered = wageRuns.filter(w => w.month === (m + 1) && w.year === y);
      monthlyTrend.push({
        label: `${MONTH_NAMES[m]} ${y}`,
        month: m + 1,
        year: y,
        totalCost: filtered.reduce((s, w) => s + w.totalLabourCost, 0),
        totalWorkers: filtered.reduce((s, w) => s + w.workers.length, 0),
      });
    }

    res.json({
      totalSites,
      activeSites,
      totalWageRuns,
      totalWorkers,
      totalLabourCost,
      totalNetPaid,
      monthlyTrend,
    });
  } catch (error) {
    next(error);
  }
};
