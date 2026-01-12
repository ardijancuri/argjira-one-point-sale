import axios from 'axios';

// Auto-detect API URL based on environment
const getApiUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In development, use the current hostname with port 3000
  // This allows the app to work from any PC on the network
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }

  // For network access (e.g., 192.168.x.x), use the same IP with port 3000
  return `http://${hostname}:3000/api`;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Company Settings
export const companySettingsAPI = {
  get: () => api.get('/company-settings'),
  update: (data) => api.put('/company-settings', data),
};

// Clients
export const clientsAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    // Only include filter values that are not null, undefined, or empty strings
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/clients?${params}`);
  },
  getByType: (type) => api.get(`/clients/by-type?type=${type}`),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

// Stock
export const stockAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/stock?${params}`);
  },
  getPOS: () => api.get('/stock/pos'),
  getStats: () => api.get('/stock/stats'),
  getById: (id) => api.get(`/stock/${id}`),
  create: (data) => api.post('/stock', data),
  update: (id, data) => api.put(`/stock/${id}`, data),
  delete: (id) => api.delete(`/stock/${id}`),
  generatePDF: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/stock/pdf?${params}`, { responseType: 'blob' });
  },
};

// Invoices
export const invoicesAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/invoices?${params}`);
  },
  getStatistics: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/invoices/statistics?${params}`);
  },
  getUnpaid: (limit = 6) => api.get(`/invoices/unpaid?limit=${limit}`),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  generatePDF: (id) => {
    return api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  },
  generateAllPDF: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/invoices/pdf?${params}`, { responseType: 'blob' });
  },
  payFull: (id) => api.post(`/invoices/${id}/payments/full`),
  revertPayment: (id) => api.post(`/invoices/${id}/payments/revert`),
};

// Payments
export const paymentsAPI = {
  getAll: (invoiceId) => api.get(`/invoices/${invoiceId}/payments`),
  create: (invoiceId, data) => api.post(`/invoices/${invoiceId}/payments`, data),
  payFull: (invoiceId) => api.post(`/invoices/${invoiceId}/payments/full`),
  delete: (id) => api.delete(`/invoices/payments/${id}`),
};

// Processing
export const processingAPI = {
  getAll: () => api.get('/processing'),
  getById: (id) => api.get(`/processing/${id}`),
  create: (data) => api.post('/processing', data),
  delete: (id) => api.delete(`/processing/${id}`),
  getStatistics: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/processing/statistics?${params}`);
  },
  generatePDF: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/processing/pdf?${params}`, { responseType: 'blob' });
  },
};

// Purchases
export const purchasesAPI = {
  getAll: () => api.get('/purchases'),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  // Random client purchases
  getRandomPurchases: () => api.get('/purchases/random/all'),
  createRandomPurchase: (data) => api.post('/purchases/random', data),
  // Productions
  getProductions: () => api.get('/purchases/productions/all'),
  getProduction: (id) => api.get(`/purchases/productions/${id}`),
  createProduction: (data) => api.post('/purchases/productions', data),
};

// Fiscal Sales
export const fiscalSalesAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/fiscal-sales?${params}`);
  },
  getDailyStats: (date) => api.get(`/fiscal-sales/daily-stats?date=${date}`),
  create: (data) => api.post('/fiscal-sales', data),
  generateInvoice: (id) => api.post(`/fiscal-sales/${id}/generate-invoice`),
  getSaleItems: (id) => api.get(`/fiscal-sales/${id}/items`),
  returnStockForStorno: (id) => api.post(`/fiscal-sales/${id}/return-stock`),
};

// Fiscal Print Queue (Centralized Printing)
export const fiscalPrintAPI = {
  // Submit a print job to the queue
  submitJob: (data) => api.post('/fiscal-print/jobs', data),
  // Get pending jobs (for print server)
  getPendingJobs: (limit = 10) => api.get(`/fiscal-print/jobs/pending?limit=${limit}`),
  // Claim next job atomically (for print server)
  claimNextJob: () => api.post('/fiscal-print/jobs/claim'),
  // Get recent jobs history
  getRecentJobs: (limit = 50) => api.get(`/fiscal-print/jobs/recent?limit=${limit}`),
  // Get queue statistics
  getStats: () => api.get('/fiscal-print/stats'),
  // Get job status by ID
  getJobStatus: (id) => api.get(`/fiscal-print/jobs/status/${id}`),
  // Mark job as completed
  markComplete: (id) => api.put(`/fiscal-print/jobs/${id}/complete`),
  // Mark job as failed
  markFailed: (id, error) => api.put(`/fiscal-print/jobs/${id}/fail`, { error }),
  // Clean up old jobs
  cleanup: (days = 7) => api.delete(`/fiscal-print/jobs/cleanup?days=${days}`),
};

// Cash
export const cashAPI = {
  get: () => api.get('/cash'),
  getTransactions: () => api.get('/cash/transactions'),
  add: (data) => api.post('/cash/add', data),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getChartData: (period = 'ditor') => api.get(`/dashboard/chart?period=${period}`),
};

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export default api;

