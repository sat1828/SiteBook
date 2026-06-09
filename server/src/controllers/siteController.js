import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Site from '../models/Site.js';
import User from '../models/User.js';

export const createSite = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { name, location, wageRates, budget, materialLowStockThreshold } = req.body;

    const site = await Site.create({
      name,
      contractorId: req.userId,
      location,
      wageRates,
      budget,
      materialLowStockThreshold,
    });

    res.status(201).json({ site });
  } catch (error) {
    next(error);
  }
};

export const getSites = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'contractor') {
      query.contractorId = req.userId;
    } else if (req.user.role === 'supervisor') {
      query.supervisors = req.userId;
    } else if (req.user.role === 'compliance_officer') {
      query.contractorId = req.user.contractorId;
    }

    const sites = await Site.find(query)
      .populate('supervisors', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ sites });
  } catch (error) {
    next(error);
  }
};

export const getSite = async (req, res, next) => {
  try {
    const site = await Site.findById(req.params.id)
      .populate('supervisors', 'name email phone')
      .lean();

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.contractorId.toString() !== req.userId.toString()
      && req.user.role !== 'compliance_officer'
      && !site.supervisors.some(s => s._id.toString() === req.userId.toString())) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }

    res.json({ site });
  } catch (error) {
    next(error);
  }
};

export const updateSite = async (req, res, next) => {
  try {
    const site = await Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }
    if (site.contractorId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the contractor can update this site' });
    }

    const allowed = ['name', 'location', 'wageRates', 'budget', 'status', 'materialLowStockThreshold'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        site[key] = req.body[key];
      }
    }

    await site.save();
    res.json({ site });
  } catch (error) {
    next(error);
  }
};

export const deleteSite = async (req, res, next) => {
  try {
    const site = await Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }
    if (site.contractorId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the contractor can delete this site' });
    }

    site.status = 'completed';
    await site.save();
    res.json({ message: 'Site marked as completed' });
  } catch (error) {
    next(error);
  }
};

export const assignSupervisor = async (req, res, next) => {
  try {
    const { supervisorId } = req.body;
    const site = await Site.findById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    if (site.contractorId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const supervisorUser = await User.findById(supervisorId).lean();
    if (!supervisorUser || supervisorUser.role !== 'supervisor') {
      return res.status(400).json({ error: 'Invalid supervisor: user must have supervisor role' });
    }

    const sid = supervisorId.toString ? supervisorId.toString() : String(supervisorId);
    const alreadyAssigned = site.supervisors.some(s => (s._id || s).toString() === sid);
    if (!alreadyAssigned) {
      site.supervisors.push(supervisorId);
      await site.save();
    }

    res.json({ site });
  } catch (error) {
    next(error);
  }
};
