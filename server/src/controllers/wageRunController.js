import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import WageRun from '../models/WageRun.js';
import Site from '../models/Site.js';
import Worker from '../models/Worker.js';
import User from '../models/User.js';
import { generateBOCWMusterRoll, generateWageSlip, generateAppointmentLetter, generateEPFECR } from '../services/pdfService.js';
import { sendPayslipWhatsApp } from '../services/whatsappService.js';
import { computeEpfEsic } from '../services/complianceService.js';

export const generateWageRun = async (req, res, next) => {
  try {
    const { siteId, month, year } = req.body;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const aggregated = await Attendance.getAggregatedMonthly(siteId, month, year);

    if (aggregated.length === 0) {
      return res.status(400).json({ error: 'No attendance records found for this period' });
    }

    const workers = aggregated.map(a => {
      const grossPay = Math.round((a.basePay || 0) + (a.overtimePay || 0));
      const contributions = computeEpfEsic(grossPay);
      const netPayable = grossPay - contributions.epfEmployee - contributions.esicEmployee;

      return {
        workerId: a.workerId,
        workerName: a.workerName,
        fatherName: a.fatherName || '',
        skill: a.skill,
        dailyRate: a.dailyRate || a.agreedRate,
        totalDays: a.totalDays || 0,
        fullDays: a.fullDays || 0,
        halfDays: a.halfDays || 0,
        absentDays: a.absentDays || 0,
        overtimeDays: a.overtimeDays || 0,
        totalOvertimeHours: Math.round(a.totalOvertimeHours || 0),
        basePay: Math.round(a.basePay || 0),
        overtimePay: Math.round(a.overtimePay || 0),
        grossPay,
        ...contributions,
        netPayable,
        adjustments: [],
      };
    });

    const totalLabourCost = workers.reduce((s, w) => s + w.grossPay, 0);
    const totalNetPayable = workers.reduce((s, w) => s + w.netPayable, 0);
    const totalEpfEmployer = workers.reduce((s, w) => s + w.epfEmployer, 0);
    const totalEpfEmployee = workers.reduce((s, w) => s + w.epfEmployee, 0);
    const totalEsicEmployer = workers.reduce((s, w) => s + w.esicEmployer, 0);
    const totalEsicEmployee = workers.reduce((s, w) => s + w.esicEmployee, 0);
    const budgetVariance = site.budget ? totalLabourCost - site.budget : 0;

    let wageRun = await WageRun.findOne({ siteId, month, year });
    if (wageRun) {
      if (wageRun.status === 'approved' || wageRun.status === 'paid') {
        return res.status(400).json({
          error: `Cannot regenerate: wage run is already ${wageRun.status}. Create a correction entry instead.`,
        });
      }
      wageRun.workers = workers;
      wageRun.totalLabourCost = totalLabourCost;
      wageRun.totalNetPayable = totalNetPayable;
      wageRun.totalEpfEmployer = totalEpfEmployer;
      wageRun.totalEpfEmployee = totalEpfEmployee;
      wageRun.totalEsicEmployer = totalEsicEmployer;
      wageRun.totalEsicEmployee = totalEsicEmployee;
      wageRun.budgetVariance = budgetVariance;
      wageRun.status = 'draft';
      await wageRun.save();
    } else {
      wageRun = await WageRun.create({
        siteId,
        contractorId: req.userId,
        month,
        year,
        workers,
        totalLabourCost,
        totalNetPayable,
        totalEpfEmployer,
        totalEpfEmployee,
        totalEsicEmployer,
        totalEsicEmployee,
        budgetVariance,
        status: 'draft',
      });
    }

    res.status(201).json({ wageRun });
  } catch (error) {
    next(error);
  }
};

export const getWageRuns = async (req, res, next) => {
  try {
    let query = { contractorId: req.userId };
    if (req.query.siteId) query.siteId = req.query.siteId;
    if (req.query.status) query.status = req.query.status;

    const wageRuns = await WageRun.find(query)
      .populate('siteId', 'name')
      .sort({ year: -1, month: -1 })
      .lean();

    res.json({ wageRuns });
  } catch (error) {
    next(error);
  }
};

export const getWageRun = async (req, res, next) => {
  try {
    const wageRun = await WageRun.findById(req.params.id)
      .populate('siteId', 'name location budget')
      .lean();

    if (!wageRun) return res.status(404).json({ error: 'Wage run not found' });

    if (String(wageRun.contractorId) !== String(req.userId) && req.user.role !== 'compliance_officer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ wageRun });
  } catch (error) {
    next(error);
  }
};

export const approveWageRun = async (req, res, next) => {
  try {
    const wageRun = await WageRun.findById(req.params.id);
    if (!wageRun) return res.status(404).json({ error: 'Wage run not found' });
    if (wageRun.status !== 'draft') {
      return res.status(400).json({ error: `Wage run is already ${wageRun.status}` });
    }

    wageRun.status = 'approved';
    wageRun.approvedBy = req.userId;
    wageRun.approvedAt = new Date();
    await wageRun.save();

    res.json({ wageRun });
  } catch (error) {
    next(error);
  }
};

export const markPaid = async (req, res, next) => {
  try {
    const { paymentReference } = req.body;
    const wageRun = await WageRun.findById(req.params.id);
    if (!wageRun) return res.status(404).json({ error: 'Wage run not found' });
    if (wageRun.status !== 'approved') {
      return res.status(400).json({ error: 'Wage run must be approved before marking paid' });
    }

    wageRun.status = 'paid';
    wageRun.paidAt = new Date();
    wageRun.paymentReference = paymentReference || null;
    await wageRun.save();

    const site = await Site.findById(wageRun.siteId).lean();
    for (const worker of wageRun.workers) {
      try {
        const workerDoc = await Worker.findById(worker.workerId).lean();
        if (workerDoc?.phone) {
          await sendPayslipWhatsApp(
            workerDoc.phone,
            worker.workerId,
            wageRun._id,
            workerDoc.name,
          );
        }
      } catch (err) {
        console.error(`Failed to send payslip to worker ${worker.workerId}:`, err.message);
      }
    }

    res.json({ wageRun });
  } catch (error) {
    next(error);
  }
};

export const downloadMusterRoll = async (req, res, next) => {
  try {
    const wageRun = await WageRun.findById(req.params.id).lean();
    if (!wageRun) return res.status(404).json({ error: 'Wage run not found' });

    // Authorization
    if (String(wageRun.contractorId) !== String(req.userId) && req.user.role !== 'compliance_officer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const site = await Site.findById(wageRun.siteId).lean();

    // Fetch actual attendance records for the muster roll from the Attendance collection
    const startDate = new Date(wageRun.year, wageRun.month - 1, 1);
    const endDate = new Date(wageRun.year, wageRun.month, 0, 23, 59, 59, 999);
    const attendanceRecords = await Attendance.find({
      siteId: wageRun.siteId,
      date: { $gte: startDate, $lte: endDate },
    }).select('workerId date status overtimeHours').lean();

    // Join attendance records into wageRun worker entries
    const workersWithAttendance = wageRun.workers.map(w => ({
      ...w,
      attendanceRecords: attendanceRecords
        .filter(a => String(a.workerId) === String(w.workerId))
        .map(a => ({ date: a.date, status: a.status, overtimeHours: a.overtimeHours })),
    }));

    const contractor = await User.findById(wageRun.contractorId).select('name bocwRegNo establishmentAddress').lean();
    const pdf = await generateBOCWMusterRoll(site, workersWithAttendance, wageRun.month, wageRun.year, contractor?.name, contractor?.bocwRegNo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="muster-roll-${site.name}-${wageRun.month}-${wageRun.year}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};

export const downloadWageSlip = async (req, res, next) => {
  try {
    const { workerId, wageRunId } = req.params;
    const wageRun = await WageRun.findById(wageRunId).lean();
    if (!wageRun) return res.status(404).json({ error: 'Wage run not found' });

    if (String(wageRun.contractorId) !== String(req.userId) && req.user.role !== 'compliance_officer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const worker = await Worker.findById(workerId).lean();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const wageEntry = wageRun.workers.find(w => String(w.workerId) === workerId);
    if (!wageEntry) return res.status(404).json({ error: 'Worker not in this wage run' });

    const site = await Site.findById(wageRun.siteId).lean();
    const pdf = await generateWageSlip(worker, wageEntry, site?.name || 'Site', wageRun.month, wageRun.year);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="wageslip-${worker.name}-${wageRun.month}-${wageRun.year}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};

export const generateAppointmentLetterPDF = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.workerId).populate('siteId').lean();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    if (String(worker.contractorId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const contractor = await User.findById(worker.contractorId).lean();
    const pdf = await generateAppointmentLetter(worker, worker.siteId, contractor?.name);

    await Worker.findByIdAndUpdate(worker._id, { appointmentLetterGenerated: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="appointment-${worker.name}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};

export const exportEPFECR = async (req, res, next) => {
  try {
    const wageRun = await WageRun.findById(req.params.id).lean();
    if (!wageRun) return res.status(404).json({ error: 'Wage run not found' });
    if (String(wageRun.contractorId) !== String(req.userId) && req.user.role !== 'compliance_officer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const site = await Site.findById(wageRun.siteId).lean();
    const ecr = await generateEPFECR(wageRun, site);

    res.json({ ecr });
  } catch (error) {
    next(error);
  }
};
