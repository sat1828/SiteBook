import Worker from '../models/Worker.js';
import WageRun from '../models/WageRun.js';
import Attendance from '../models/Attendance.js';
import Site from '../models/Site.js';
import { decodePayslipToken } from '../utils/helpers.js';

export const getWorkerByPhone = async (req, res, next) => {
  try {
    const { phone } = req.params;
    const worker = await Worker.findOne({ phone })
      .populate('siteId', 'name location')
      .lean();

    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    // Only allow if user is the contractor or assigned supervisor
    const isContractor = String(worker.contractorId) === String(req.userId);
    const isSupervisor = req.user.role === 'supervisor'
      && req.user.assignedSites?.some(s => String(s) === String(worker.siteId));
    if (!isContractor && !isSupervisor && req.user.role !== 'compliance_officer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ worker });
  } catch (error) {
    next(error);
  }
};

export const getWorkerAttendance = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { limit } = req.query;

    const worker = await Worker.findById(workerId).select('contractorId siteId').lean();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const isContractor = String(worker.contractorId) === String(req.userId);
    const isAssigned = req.user.assignedSites?.some(s => String(s) === String(worker.siteId));
    if (!isContractor && !isAssigned && req.user.role !== 'compliance_officer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attendance = await Attendance.find({ workerId })
      .sort({ date: -1 })
      .limit(parseInt(limit) || 30)
      .lean();

    res.json({ attendance });
  } catch (error) {
    next(error);
  }
};

export const getWorkerWageHistory = async (req, res, next) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findById(workerId).select('contractorId siteId').lean();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const isContractor = String(worker.contractorId) === String(req.userId);
    const isAssigned = req.user.assignedSites?.some(s => String(s) === String(worker.siteId));
    if (!isContractor && !isAssigned && req.user.role !== 'compliance_officer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const wageRuns = await WageRun.find({
      'workers.workerId': workerId,
    })
      .populate('siteId', 'name')
      .sort({ year: -1, month: -1 })
      .limit(12)
      .lean();

    const history = wageRuns.map(wr => {
      const entry = wr.workers.find(w => String(w.workerId) === workerId);
      return {
        wageRunId: wr._id,
        siteName: wr.siteId?.name,
        month: wr.month,
        year: wr.year,
        status: wr.status,
        ...(entry ? {
          grossPay: entry.grossPay,
          netPayable: entry.netPayable,
          fullDays: entry.fullDays,
          halfDays: entry.halfDays,
          overtimeHours: entry.totalOvertimeHours,
          dailyRate: entry.dailyRate,
        } : {}),
      };
    });

    res.json({ history });
  } catch (error) {
    next(error);
  }
};

export const viewPayslipByToken = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decoded = decodePayslipToken(token);
    if (!decoded) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const { workerId, wageRunId } = decoded;

    const wageRun = await WageRun.findById(wageRunId)
      .populate('siteId', 'name')
      .lean();

    if (!wageRun) return res.status(404).json({ error: 'Wage slip not found' });

    const entry = wageRun.workers.find(w => String(w.workerId) === workerId);
    if (!entry) return res.status(404).json({ error: 'Worker not found in this wage run' });

    const worker = await Worker.findById(workerId).lean();

    res.json({
      payslip: {
        workerName: worker?.name || entry.workerName,
        siteName: wageRun.siteId?.name,
        month: wageRun.month,
        year: wageRun.year,
        ...entry,
      },
    });
  } catch (error) {
    next(error);
  }
};
