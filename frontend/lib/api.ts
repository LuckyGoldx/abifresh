import axios from 'axios';

// Empty string = use relative URLs (Next.js API routes at /app/api/).
// Set NEXT_PUBLIC_API_URL=http://localhost:5000 to fall back to Express backend.
let API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
if (API_URL.includes('your-vercel-domain')) {
  API_URL = '';
}

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
        // Handle both formats: state-wrapped and direct
        const authToken = parsed.state?.token ?? parsed.token;
        
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
    const errorMessage = error.response?.data?.error || '';
    
    // Handle deactivated account - force logout on any 403 with deactivated message
    if (status === 403 && errorMessage.toLowerCase().includes('deactivated')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        // Redirect to login with deactivated message
        window.location.href = '/login?deactivated=true';
      }
      return Promise.reject(error);
    }

    // Auto-logout on any 401 (expired/invalid JWT), except the login endpoint itself
    if (status === 401 && !url?.includes('/auth/login')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
