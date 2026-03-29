/**
 * Axios API Service
 * Central HTTP client with auth token injection
 */
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const userAPI = {
  search: (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
  getProfile: (userId) => api.get(`/users/${userId}`),
  updateProfile: (data) => api.patch('/users/profile', data),
  changePassword: (data) => api.patch('/users/change-password', data),
  toggleBlock: (userId) => api.patch(`/users/block/${userId}`),
  getOnlineUsers: () => api.get('/users/online'),
};

// ─── Chats ────────────────────────────────────────────────────────────────────
export const chatAPI = {
  accessChat: (userId) => api.post('/chats/access', { userId }),
  getMyChats: () => api.get('/chats'),
  getChatById: (chatId) => api.get(`/chats/${chatId}`),
  createGroup: (data) => api.post('/chats/group', data),
  addToGroup: (chatId, userId) => api.patch('/chats/group/add', { chatId, userId }),
  removeFromGroup: (chatId, userId) => api.patch('/chats/group/remove', { chatId, userId }),
  makeAdmin: (chatId, userId) => api.patch('/chats/group/admin', { chatId, userId }),
  updateGroup: (chatId, data) => api.patch(`/chats/${chatId}`, data),
  deleteChat: (chatId) => api.delete(`/chats/${chatId}`),
};

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messageAPI = {
  getMessages: (chatId, page = 1, limit = 50) =>
    api.get(`/messages/${chatId}?page=${page}&limit=${limit}`),
  sendMessage: (data) => api.post('/messages', data),
  editMessage: (messageId, content) => api.patch(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId, deleteFor) =>
    api.delete(`/messages/${messageId}`, { data: { deleteFor } }),
  markAsSeen: (chatId) => api.patch(`/messages/seen/${chatId}`),
  searchMessages: (q, chatId) =>
    api.get(`/messages/search?q=${encodeURIComponent(q)}${chatId ? `&chatId=${chatId}` : ''}`),
  addReaction: (messageId, emoji) => api.patch(`/messages/${messageId}/reaction`, { emoji }),
};

// ─── Uploads ──────────────────────────────────────────────────────────────────
export const uploadAPI = {
  uploadFile: (formData) =>
    api.post('/uploads/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadAvatar: (formData) =>
    api.post('/uploads/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Statuses ─────────────────────────────────────────────────────────────────
export const statusAPI = {
  getStatuses: () => api.get('/statuses'),
  createStatus: (data) => api.post('/statuses', data),
  updateStatus: (statusId, data) => api.patch(`/statuses/${statusId}`, data),
  deleteStatus: (statusId) => api.delete(`/statuses/${statusId}`),
  viewStatus: (statusId) => api.post(`/statuses/${statusId}/view`),
};

export default api;
