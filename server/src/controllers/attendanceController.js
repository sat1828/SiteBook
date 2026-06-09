import { validationResult } from 'express-validator';
import Attendance from '../models/Attendance.js';
import Site from '../models/Site.js';
import Worker from '../models/Worker.js';
import { calculateDistance } from '../utils/helpers.js';
import env from '../config/env.js';

export const markAttendance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { workerId, siteId, date, status, overtimeHours, photoUrl, geoCoordinates, offlineId } = req.body;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    // Authorization
    const isContractor = String(site.contractorId) === String(req.userId);
    const isAssignedSupervisor = req.user.role === 'supervisor'
      && site.supervisors?.some(s => String(s) === String(req.userId));
    if (!isContractor && !isAssignedSupervisor) {
      return res.status(403).json({ error: 'You do not have permission to mark attendance at this site' });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    if (!worker.isActive) {
      return res.status(400).json({ error: 'Worker is inactive' });
    }

    // Verify worker belongs to this site
    if (String(worker.siteId) !== String(siteId)) {
      return res.status(400).json({ error: 'Worker does not belong to this site' });
    }

    let geoValidated = false;
    if (geoCoordinates && site.location?.coordinates) {
      const dist = calculateDistance(
        geoCoordinates[1], geoCoordinates[0],
        site.location.coordinates[1], site.location.coordinates[0],
      );
      geoValidated = dist <= (site.location.radius || env.SITE_DEFAULT_RADIUS);
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({ workerId, date: attendanceDate });
    if (existing) {
      existing.status = status;
      existing.overtimeHours = overtimeHours || 0;
      existing.markedBy = req.userId;
      existing.geoValidated = geoValidated;
      if (photoUrl) existing.photoUrl = photoUrl;
      if (geoCoordinates) existing.geoCoordinates = { type: 'Point', coordinates: geoCoordinates };
      existing.syncedFromOffline = !!offlineId;
      existing.offlineId = offlineId || existing.offlineId;
      await existing.save();

      req.app.get('io')?.to(`site:${siteId}`).emit('attendance:updated', {
        workerId, siteId, status, date: attendanceDate,
      });

      return res.json({ attendance: existing, updated: true });
    }

    const attendance = await Attendance.create({
      workerId,
      siteId,
      contractorId: site.contractorId,
      date: attendanceDate,
      status,
      overtimeHours: overtimeHours || 0,
      photoUrl,
      markedBy: req.userId,
      geoValidated,
      geoCoordinates: geoCoordinates ? { type: 'Point', coordinates: geoCoordinates } : undefined,
      syncedFromOffline: !!offlineId,
      offlineId,
    });

    req.app.get('io')?.to(`site:${siteId}`).emit('attendance:marked', {
      workerId, workerName: worker.name, siteId, status, date: attendanceDate,
    });

    res.status(201).json({ attendance });
  } catch (error) {
    next(error);
  }
};

export const bulkMarkAttendance = async (req, res, next) => {
  try {
    const { siteId, date, records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    // Authorization: contractor owns site, or supervisor is assigned
    const isContractor = String(site.contractorId) === String(req.userId);
    const isAssignedSupervisor = req.user.role === 'supervisor'
      && site.supervisors?.some(s => String(s) === String(req.userId));
    if (!isContractor && !isAssignedSupervisor) {
      return res.status(403).json({ error: 'You do not have permission to mark attendance at this site' });
    }

    // Validate that all workerIds belong to this site
    const validWorkerIds = new Set(
      (await Worker.find({ siteId, isActive: true }).select('_id').lean()).map(w => String(w._id))
    );
    for (const record of records) {
      if (!validWorkerIds.has(String(record.workerId))) {
        return res.status(400).json({
          error: `Worker ${record.workerId} does not belong to this site or is inactive`,
        });
      }
    }

    const results = [];
    for (const record of records) {
      try {
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const existing = await Attendance.findOne({ workerId: record.workerId, date: attendanceDate });
        if (existing) {
          existing.status = record.status;
          existing.overtimeHours = record.overtimeHours || 0;
          existing.markedBy = req.userId;
          existing.syncedFromOffline = !!record.offlineId;
          existing.offlineId = record.offlineId || existing.offlineId;
          if (record.geoCoordinates) {
            existing.geoCoordinates = { type: 'Point', coordinates: record.geoCoordinates };
          }
          await existing.save();
          results.push({ workerId: record.workerId, status: record.status, updated: true });
        } else {
          const att = await Attendance.create({
            workerId: record.workerId,
            siteId,
            contractorId: site.contractorId,
            date: attendanceDate,
            status: record.status,
            overtimeHours: record.overtimeHours || 0,
            markedBy: req.userId,
            syncedFromOffline: !!record.offlineId,
            offlineId: record.offlineId,
          });
          results.push({ workerId: record.workerId, status: record.status, _id: att._id });
        }
      } catch (err) {
        results.push({ workerId: record.workerId, error: err.message });
      }
    }

    req.app.get('io')?.to(`site:${siteId}`).emit('attendance:bulk', {
      siteId, date, count: results.length,
    });

    res.status(201).json({ results });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req, res, next) => {
  try {
    let query = {};

    if (req.query.siteId) {
      const site = await Site.findById(req.query.siteId).lean();
      if (!site) return res.status(404).json({ error: 'Site not found' });
      const isContractor = String(site.contractorId) === String(req.userId);
      const isAssignedSupervisor = req.user.role === 'supervisor'
        && site.supervisors?.some(s => String(s) === String(req.userId));
      if (!isContractor && !isAssignedSupervisor && req.user.role !== 'compliance_officer') {
        return res.status(403).json({ error: 'Access denied to this site' });
      }
      query.siteId = req.query.siteId;
    } else if (req.user.role === 'supervisor') {
      const assigned = await Site.find({ supervisors: req.userId }).select('_id').lean();
      query.siteId = { $in: assigned.map(s => s._id) };
    } else if (req.user.role !== 'compliance_officer') {
      const owned = await Site.find({ contractorId: req.userId }).select('_id').lean();
      query.siteId = { $in: owned.map(s => s._id) };
    }

    if (req.query.workerId) query.workerId = req.query.workerId;
    if (req.query.date) {
      const d = new Date(req.query.date);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: d, $lt: end };
    }
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }
    if (req.query.status) query.status = req.query.status;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const skip = (page - 1) * limit;

    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .populate('workerId', 'name fatherName skill')
        .populate('markedBy', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(query),
    ]);

    res.json({ attendance, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

export const getDailyAttendance = async (req, res, next) => {
  try {
    const { siteId, date } = req.params;

    const site = await Site.findById(siteId).lean();
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const isContractor = String(site.contractorId) === String(req.userId);
    const isAssignedSupervisor = req.user.role === 'supervisor'
      && site.supervisors?.some(s => String(s) === String(req.userId));
    if (!isContractor && !isAssignedSupervisor && req.user.role !== 'compliance_officer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const endDate = new Date(queryDate);
    endDate.setDate(endDate.getDate() + 1);

    const attendance = await Attendance.find({
      siteId,
      date: { $gte: queryDate, $lt: endDate },
    })
      .populate('workerId', 'name fatherName skill agreedRate phone')
      .sort({ 'workerId.name': 1 })
      .lean();

    const workers = await Worker.find({ siteId, isActive: true }).lean();
    const attendanceMap = new Map(attendance.map(a => [String(a.workerId?._id || a.workerId), a]));

    const complete = workers.map(w => {
      const att = attendanceMap.get(String(w._id));
      return {
        workerId: w._id,
        workerName: w.name,
        fatherName: w.fatherName,
        skill: w.skill,
        phone: w.phone,
        status: att?.status || 'absent',
        overtimeHours: att?.overtimeHours || 0,
        photoUrl: att?.photoUrl || null,
        geoValidated: att?.geoValidated || false,
        markedAt: att?.createdAt || null,
      };
    });

    res.json({ attendance: complete, date: queryDate });
  } catch (error) {
    next(error);
  }
};

export const getSiteAttendanceSummary = async (req, res, next) => {
  try {
    const { siteId, month, year } = req.query;

    const site = await Site.findById(siteId).lean();
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const isContractor = String(site.contractorId) === String(req.userId);
    const isAssignedSupervisor = req.user.role === 'supervisor'
      && site.supervisors?.some(s => String(s) === String(req.userId));
    if (!isContractor && !isAssignedSupervisor && req.user.role !== 'compliance_officer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();

    const aggregated = await Attendance.getAggregatedMonthly(siteId, m, y);
    res.json({ summary: aggregated, month: m, year: y });
  } catch (error) {
    next(error);
  }
};
