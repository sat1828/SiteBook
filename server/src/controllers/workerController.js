import { validationResult } from 'express-validator';
import Worker from '../models/Worker.js';
import Site from '../models/Site.js';

export const createWorker = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { name, fatherName, phone, aadhaarLast4, skill, siteId, agreedRate, bankDetails } = req.body;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    if (site.contractorId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }

    const worker = await Worker.create({
      name, fatherName, phone, aadhaarLast4, skill,
      siteId, contractorId: req.userId, agreedRate, bankDetails,
    });

    res.status(201).json({ worker });
  } catch (error) {
    next(error);
  }
};

export const bulkCreateWorkers = async (req, res, next) => {
  try {
    const { workers } = req.body;
    if (!Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: 'Workers array is required' });
    }

    // Validate every worker's siteId belongs to the contractor
    const uniqueSiteIds = [...new Set(workers.map(w => String(w.siteId)))];
    const sites = await Site.find({ _id: { $in: uniqueSiteIds }, contractorId: req.userId }).lean();
    const ownedSiteIds = new Set(sites.map(s => String(s._id)));
    for (const siteId of uniqueSiteIds) {
      if (!ownedSiteIds.has(siteId)) {
        return res.status(403).json({ error: `Access denied: site ${siteId} does not belong to you` });
      }
    }

    const enriched = workers.map(w => ({
      ...w,
      contractorId: req.userId,
    }));

    const created = await Worker.insertMany(enriched, { ordered: false });
    res.status(201).json({ count: created.length, workers: created });
  } catch (error) {
    next(error);
  }
};

export const getWorkers = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'contractor') {
      query.contractorId = req.userId;
    } else if (req.user.role === 'supervisor') {
      query.siteId = { $in: req.user.assignedSites || [] };
    } else {
      query.contractorId = req.user.contractorId;
    }

    if (req.query.siteId) {
      query.siteId = req.query.siteId;
    }
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    if (req.query.skill) {
      query.skill = req.query.skill;
    }

    const workers = await Worker.find(query)
      .populate('siteId', 'name')
      .sort({ name: 1 })
      .lean();

    res.json({ workers });
  } catch (error) {
    next(error);
  }
};

export const getWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id)
      .populate('siteId', 'name location contractorId')
      .lean();

    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const site = worker.siteId;
    const isContractor = site && String(site.contractorId) === String(req.userId);
    const isAssignedSupervisor = req.user.role === 'supervisor'
      && site?.supervisors?.some(s => String(s) === String(req.userId));
    if (!isContractor && !isAssignedSupervisor && req.user.role !== 'compliance_officer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ worker });
  } catch (error) {
    next(error);
  }
};

export const updateWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const allowed = ['name', 'fatherName', 'phone', 'aadhaarLast4', 'skill', 'agreedRate', 'bankDetails', 'isActive', 'esicNumber', 'epfUan'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        worker[key] = req.body[key];
      }
    }

    await worker.save();
    res.json({ worker });
  } catch (error) {
    next(error);
  }
};

export const deleteWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    worker.isActive = false;
    worker.leavedAt = new Date();
    await worker.save();
    res.json({ message: 'Worker deactivated' });
  } catch (error) {
    next(error);
  }
};
