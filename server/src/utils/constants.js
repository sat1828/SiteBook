export const ROLES = {
  CONTRACTOR: 'contractor',
  SUPERVISOR: 'supervisor',
  COMPLIANCE_OFFICER: 'compliance_officer',
};

export const ATTENDANCE_STATUS = {
  FULL: 'full',
  HALF: 'half',
  ABSENT: 'absent',
  OVERTIME: 'overtime',
};

export const SKILL_TIERS = {
  UNSKILLED: 'unskilled',
  SEMI_SKILLED: 'semi_skilled',
  SKILLED: 'skilled',
  HIGHLY_SKILLED: 'highly_skilled',
};

export const SITE_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
};

export const WAGE_RUN_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  PAID: 'paid',
};

export const MATERIAL_TRANSACTION_TYPE = {
  INWARD: 'inward',
  OUTWARD: 'outward',
};

export const EPF_RATE_EMPLOYER = 0.12;
export const EPF_RATE_EMPLOYEE = 0.12;
export const ESIC_RATE_EMPLOYER = 0.0325;
export const ESIC_RATE_EMPLOYEE = 0.0075;
export const EPF_WAGE_CEILING = 15000;
export const OT_MULTIPLIER = 1.5;
export const STANDARD_HOURS_PER_DAY = 8;

export const BOCW_CESS_RATE = 0.01;

export const COMPLIANCE_DEADLINES = {
  EPF: { day: 15, graceDays: 0 },
  ESIC: { day: 15, graceDays: 0 },
  BOCW_CESS: { day: 30, graceDays: 7 },
};
