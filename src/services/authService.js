// Aura Voice AI - Authentication Service
// =====================================

import { apiHelper } from './api';

const TOKEN_KEY = process.env.REACT_APP_TOKEN_STORAGE_KEY || 'aura_auth_token';

/**
 * Authentication Service
 * 
 * Handles all authentication-related API calls
 * Connects to FastAPI backend authentication endpoints
 */
export const authService = {
  // Login user
  login: async (email, password) => {
    try {
      const result = await apiHelper.post('/auth/login', {
        email,
        password
      });

      if (result.success && result.data.access_token) {
        // Store token in localStorage
        localStorage.setItem(TOKEN_KEY, result.data.access_token);
        
        return {
          success: true,
          user: result.data.user,
          token: result.data.access_token
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Login failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  },

  // Register new user
  register: async (email, password, name, company = '') => {
    try {
      const result = await apiHelper.post('/auth/register', {
        email,
        password,
        name,
        company
      });

      if (result.success) {
        return {
          success: true,
          message: result.data.message || 'Registration successful'
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Registration failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  },

  // Logout user
  logout: async () => {
    try {
      // Call logout endpoint (optional - clears server-side session)
      await apiHelper.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if server call fails
      console.warn('Server logout failed:', error);
    } finally {
      // Always clear local token
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  // Get current user profile
  getCurrentUser: async () => {
    try {
      const result = await apiHelper.get('/auth/me');
      
      if (result.success) {
        return {
          success: true,
          user: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get user profile'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get user profile'
      };
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const result = await apiHelper.put('/auth/me', userData);
      
      if (result.success) {
        return {
          success: true,
          user: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to update profile'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update profile'
      };
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    try {
      const result = await apiHelper.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });

      if (result.success) {
        return {
          success: true,
          message: 'Password changed successfully'
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to change password'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to change password'
      };
    }
  },

  // Request password reset
  requestPasswordReset: async (email) => {
    try {
      const result = await apiHelper.post('/auth/forgot-password', { email });
      
      if (result.success) {
        return {
          success: true,
          message: 'Password reset email sent'
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to send reset email'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to send reset email'
      };
    }
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    try {
      const result = await apiHelper.post('/auth/reset-password', {
        token,
        new_password: newPassword
      });

      if (result.success) {
        return {
          success: true,
          message: 'Password reset successfully'
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to reset password'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to reset password'
      };
    }
  },

  // Refresh JWT token
  refreshToken: async () => {
    try {
      const currentToken = localStorage.getItem(TOKEN_KEY);
      if (!currentToken) {
        return { success: false, error: 'No token to refresh' };
      }

      const result = await apiHelper.post('/auth/refresh', {
        token: currentToken
      });

      if (result.success && result.data.access_token) {
        localStorage.setItem(TOKEN_KEY, result.data.access_token);
        return {
          success: true,
          token: result.data.access_token
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to refresh token'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to refresh token'
      };
    }
  },

  // Verify email address
  verifyEmail: async (token) => {
    try {
      const result = await apiHelper.post('/auth/verify-email', { token });
      
      if (result.success) {
        return {
          success: true,
          message: 'Email verified successfully'
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Email verification failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Email verification failed'
      };
    }
  },

  // Resend verification email
  resendVerification: async () => {
    try {
      const result = await apiHelper.post('/auth/resend-verification');
      
      if (result.success) {
        return {
          success: true,
          message: 'Verification email sent'
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to send verification email'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to send verification email'
      };
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return !!token;
  },

  // Get stored token
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Clear stored token
  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export default authService;