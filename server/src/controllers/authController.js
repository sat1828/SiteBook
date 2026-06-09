import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import env from '../config/env.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
};

const generateRefreshToken = () => crypto.randomBytes(40).toString('hex');

export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { name, email, phone, password, role, contractorId } = req.body;

    if (role !== 'contractor' && !contractorId) {
      return res.status(400).json({
        error: 'Supervisors and compliance officers must be registered with a contractorId',
      });
    }

    if (contractorId) {
      const contractor = await User.findById(contractorId).lean();
      if (!contractor || contractor.role !== 'contractor') {
        return res.status(400).json({ error: 'Invalid contractorId: contractor not found' });
      }
    }

    const existing = await User.findOne({ $or: [{ email }, { phone }] }).lean();
    if (existing) {
      const field = existing.email === email ? 'Email' : 'Phone';
      return res.status(409).json({ error: `${field} already registered` });
    }

    const user = await User.create({
      name, email, phone, password, role,
      contractorId: role === 'contractor' ? null : (contractorId || null),
    });
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password').lean();
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken();
    await User.updateOne({ _id: user._id }, { $set: { refreshToken } });

    res.json({
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        contractorId: user.contractorId,
        assignedSites: user.assignedSites,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate('assignedSites').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true }).lean();
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ error: 'Refresh token required' });

    const user = await User.findOne({ refreshToken: token }).select('+refreshToken').lean();
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid refresh token' });

    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken();
    await User.updateOne({ _id: user._id }, { $set: { refreshToken: newRefreshToken } });

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
};
