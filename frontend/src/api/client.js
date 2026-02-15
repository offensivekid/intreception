import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile')
};

export const tasksAPI = {
  getTasks: (params) => api.get('/tasks', { params }),
  getTask: (taskId) => api.get(`/tasks/${taskId}`),
  createTask: (data) => api.post('/tasks', data),
  submitSolution: (taskInstanceId, data) => api.post(`/tasks/${taskInstanceId}/submit`, data)
};

export const reviewsAPI = {
  getPending: () => api.get('/reviews/pending'),
  submitReview: (solutionId, data) => api.post(`/reviews/${solutionId}`, data),
  getMySolutions: () => api.get('/solutions/my'),
  getSolutionReviews: (solutionId) => api.get(`/solutions/${solutionId}/reviews`)
};

export const subscriptionAPI = {
  createCheckout: () => api.post('/subscription/create-checkout'),
  cancel: () => api.post('/subscription/cancel'),
  getStatus: () => api.get('/subscription/status')
};

export const leaderboardAPI = {
  get: (params) => api.get('/leaderboard', { params }),
  getRank: () => api.get('/leaderboard/rank')
};

export const badgesAPI = {
  get: () => api.get('/badges')
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getPendingTasks: () => api.get('/admin/tasks/pending'),
  approveTask: (taskId) => api.post(`/admin/tasks/${taskId}/approve`),
  rejectTask: (taskId, data) => api.post(`/admin/tasks/${taskId}/reject`, data),
  getActivity: (params) => api.get('/admin/activity', { params })
};

export default api;
