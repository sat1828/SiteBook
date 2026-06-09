import Notification from '../models/Notification.js';

export const getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = { userId: req.userId };
    if (req.query.unread === 'true') filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.userId, read: false }),
    ]);

    res.json({ notifications, total, unreadCount, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { _id: { $in: req.body.ids || [req.params.id] }, userId: req.userId },
      { $set: { read: true } },
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
