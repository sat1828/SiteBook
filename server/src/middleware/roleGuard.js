export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        userRole: req.user.role,
      });
    }
    next();
  };
};

export const contractorOnly = authorize('contractor');
export const supervisorOnly = authorize('supervisor');
export const complianceOfficerOnly = authorize('compliance_officer');
export const contractorAndSupervisor = authorize('contractor', 'supervisor');
