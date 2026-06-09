import { validationResult } from 'express-validator';
import Material from '../models/Material.js';
import Site from '../models/Site.js';

export const createMaterial = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { siteId, name, sku, unit, currentStock, lowStockThreshold, industryWastageBenchmark } = req.body;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const material = await Material.create({
      siteId, contractorId: req.userId, name, sku, unit,
      currentStock: currentStock || 0,
      lowStockThreshold: lowStockThreshold || site.materialLowStockThreshold || 10,
      industryWastageBenchmark,
    });

    res.status(201).json({ material });
  } catch (error) {
    next(error);
  }
};

export const getMaterials = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.siteId) query.siteId = req.query.siteId;
    if (req.user.role !== 'compliance_officer') {
      query.contractorId = req.userId;
    }

    const materials = await Material.find(query)
      .populate('siteId', 'name')
      .sort({ name: 1 })
      .lean();

    const enriched = materials.map(m => ({
      ...m,
      totalInward: m.transactions.filter(t => t.type === 'inward').reduce((s, t) => s + t.quantity, 0),
      totalOutward: m.transactions.filter(t => t.type === 'outward').reduce((s, t) => s + t.quantity, 0),
      isLowStock: m.currentStock <= m.lowStockThreshold,
    }));

    res.json({ materials: enriched });
  } catch (error) {
    next(error);
  }
};

export const addTransaction = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const { type, quantity, rate, supplier, notes } = req.body;

    const material = await Material.findById(materialId);
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const totalCost = rate && quantity ? rate * quantity : 0;

    material.transactions.push({
      type, quantity, rate, totalCost, supplier, recordedBy: req.userId, notes,
    });

    if (type === 'inward') {
      material.currentStock += quantity;
    } else if (type === 'outward') {
      material.currentStock = Math.max(0, material.currentStock - quantity);
    }

    await material.save();

    req.app.get('io')?.to(`site:${material.siteId}`).emit('material:updated', {
      materialId: material._id,
      name: material.name,
      currentStock: material.currentStock,
    });

    res.json({ material });
  } catch (error) {
    next(error);
  }
};

export const getLowStockAlerts = async (req, res, next) => {
  try {
    const materials = await Material.find({
      contractorId: req.userId,
      $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
    })
      .populate('siteId', 'name')
      .lean();

    res.json({ alerts: materials });
  } catch (error) {
    next(error);
  }
};
