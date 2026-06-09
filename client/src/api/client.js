import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;

    if (status === 401) {
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (status === 403) {
      toast.error('You do not have permission for this action');
    }

    if (status === 429) {
      toast.error('Too many requests. Please wait.');
    }

    return Promise.reject(error);
  },
);

export default api;

export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const sites = {
  list: (params) => api.get('/sites', { params }),
  get: (id) => api.get(`/sites/${id}`),
  create: (data) => api.post('/sites', data),
  update: (id, data) => api.patch(`/sites/${id}`, data),
  delete: (id) => api.delete(`/sites/${id}`),
  assignSupervisor: (id, supervisorId) => api.post(`/sites/${id}/assign-supervisor`, { supervisorId }),
};

export const workers = {
  list: (params) => api.get('/workers', { params }),
  get: (id) => api.get(`/workers/${id}`),
  create: (data) => api.post('/workers', data),
  bulkCreate: (data) => api.post('/workers/bulk', data),
  update: (id, data) => api.patch(`/workers/${id}`, data),
  delete: (id) => api.delete(`/workers/${id}`),
};

export const attendance = {
  mark: (data) => api.post('/attendance', data),
  bulkMark: (data) => api.post('/attendance/bulk', data),
  list: (params) => api.get('/attendance', { params }),
  getDaily: (siteId, date) => api.get(`/attendance/daily/${siteId}/${date}`),
  getSummary: (params) => api.get('/attendance/summary', { params }),
};

export const wageRuns = {
  list: (params) => api.get('/wage-runs', { params }),
  get: (id) => api.get(`/wage-runs/${id}`),
  generate: (data) => api.post('/wage-runs/generate', data),
  approve: (id) => api.post(`/wage-runs/${id}/approve`),
  markPaid: (id, data) => api.post(`/wage-runs/${id}/mark-paid`, data),
  musterRoll: (id) => api.get(`/wage-runs/${id}/muster-roll`, { responseType: 'blob' }),
  wageSlip: (wageRunId, workerId) => api.get(`/wage-runs/${wageRunId}/wage-slip/${workerId}`, { responseType: 'blob' }),
  appointmentLetter: (workerId) => api.get(`/wage-runs/appointment-letter/${workerId}`, { responseType: 'blob' }),
  ecr: (id) => api.get(`/wage-runs/${id}/ecr`),
};

export const materials = {
  list: (params) => api.get('/materials', { params }),
  create: (data) => api.post('/materials', data),
  addTransaction: (materialId, data) => api.post(`/materials/${materialId}/transaction`, data),
  lowStock: () => api.get('/materials/low-stock'),
};

export const compliance = {
  report: () => api.get('/compliance/report'),
  deadlines: () => api.get('/compliance/deadlines'),
  dashboard: () => api.get('/compliance/dashboard'),
  site: (siteId) => api.get(`/compliance/site/${siteId}`),
};

export const ai = {
  resolveDispute: (data) => api.post('/ai/resolve-dispute', data),
  anomalies: () => api.get('/ai/anomalies'),
  forecast: () => api.get('/ai/forecast'),
};

export const workerPortal = {
  getByPhone: (phone) => api.get(`/worker/phone/${phone}`),
  attendance: (workerId) => api.get(`/worker/${workerId}/attendance`),
  wages: (workerId) => api.get(`/worker/${workerId}/wages`),
  viewPayslip: (token) => api.get(`/worker/payslip/view?token=${token}`),
};
