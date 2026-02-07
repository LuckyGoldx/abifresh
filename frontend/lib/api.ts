import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    // Skip token addition for login endpoint
    if (config.url?.includes('/auth/login')) {
      return config;
    }
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null;
    if (token) {
      try {
        const parsed = JSON.parse(token);
        const authToken = parsed.state?.token || parsed.token;
        
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }
      } catch (e) {
        // Silently fail - token might not be ready yet
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.response?.config?.url;
    
    // Only logout on explicit 401 from auth endpoints
    if (status === 401 && url?.includes('/auth')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    // For other 401s, let the component handle retry logic
    return Promise.reject(error);
  }
);

export default api;
