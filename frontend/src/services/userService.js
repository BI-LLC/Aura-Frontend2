// Aura Voice AI - User Service
// ============================

import { apiHelper } from './api';

/**
 * User Service
 * 
 * Handles all user-related API calls
 * User profiles, preferences, and public directory
 */
export const userService = {
  // Get all public users (for explore page)
  getPublicUsers: async (filters = {}) => {
    try {
      const result = await apiHelper.get('/users', filters);

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get users'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get users'
      };
    }
  },

  // Get user by slug
  getUserBySlug: async (slug) => {
    try {
      const result = await apiHelper.get(`/users/${slug}`);

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'User not found'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'User not found'
      };
    }
  },

  // Get user profile (authenticated)
  getUserProfile: async (userId) => {
    try {
      const result = await apiHelper.get(`/users/profile/${userId}`);

      if (result.success) {
        return {
          success: true,
          data: result.data
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

  // Update user preferences
  updatePreferences: async (preferences) => {
    try {
      const result = await apiHelper.put('/users/preferences', preferences);

      if (result.success) {
        return {
          success: true,
          message: 'Preferences updated successfully',
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to update preferences'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update preferences'
      };
    }
  },

  // Update user persona
  updatePersona: async (persona) => {
    try {
      const result = await apiHelper.put('/users/persona', persona);

      if (result.success) {
        return {
          success: true,
          message: 'Persona updated successfully',
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to update persona'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update persona'
      };
    }
  },

  // Get user preferences
  getUserPreferences: async () => {
    try {
      const result = await apiHelper.get('/users/preferences');

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get preferences'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get preferences'
      };
    }
  },

  // Get user persona
  getUserPersona: async () => {
    try {
      const result = await apiHelper.get('/users/persona');

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get persona'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get persona'
      };
    }
  },

  // Update public profile
  updatePublicProfile: async (profileData) => {
    try {
      const result = await apiHelper.put('/users/public-profile', profileData);

      if (result.success) {
        return {
          success: true,
          message: 'Public profile updated successfully',
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to update public profile'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update public profile'
      };
    }
  },

  // Upload user avatar
  uploadAvatar: async (file, onProgress = null) => {
    try {
      const result = await apiHelper.uploadFile('/users/avatar', file, onProgress);

      if (result.success) {
        return {
          success: true,
          message: 'Avatar uploaded successfully',
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to upload avatar'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to upload avatar'
      };
    }
  },

  // Search users
  searchUsers: async (query, filters = {}) => {
    try {
      const params = { q: query, ...filters };
      const result = await apiHelper.get('/users/search', params);

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Search failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Search failed'
      };
    }
  },

  // Get user statistics
  getUserStats: async (userId = null) => {
    try {
      const endpoint = userId ? `/users/stats/${userId}` : '/users/stats';
      const result = await apiHelper.get(endpoint);

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get user stats'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get user stats'
      };
    }
  },

  // Get user activity feed
  getActivityFeed: async (limit = 20, offset = 0) => {
    try {
      const result = await apiHelper.get('/users/activity', { limit, offset });

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get activity feed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get activity feed'
      };
    }
  },

  // Follow/unfollow user
  toggleFollow: async (userId) => {
    try {
      const result = await apiHelper.post(`/users/${userId}/follow`);

      if (result.success) {
        return {
          success: true,
          message: result.data.message || 'Follow status updated',
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to update follow status'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update follow status'
      };
    }
  },

  // Get user followers
  getFollowers: async (userId, limit = 50, offset = 0) => {
    try {
      const result = await apiHelper.get(`/users/${userId}/followers`, { limit, offset });

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get followers'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get followers'
      };
    }
  },

  // Get users being followed
  getFollowing: async (userId, limit = 50, offset = 0) => {
    try {
      const result = await apiHelper.get(`/users/${userId}/following`, { limit, offset });

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get following'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get following'
      };
    }
  }
};

export default userService;