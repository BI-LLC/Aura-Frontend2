// Aura Voice AI - useAPI Hook
// ===========================

import { useState, useCallback } from 'react';
import { apiHelper } from '../services/api';

/**
 * useAPI Hook
 * 
 * Custom hook for making API calls with loading states and error handling
 * Provides a clean interface for API operations throughout the app
 */
export const useAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generic API call function
  const makeRequest = useCallback(async (apiCall) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setLoading(false);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setLoading(false);
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Specific API methods
  const get = useCallback((endpoint, params) => {
    return makeRequest(() => apiHelper.get(endpoint, params));
  }, [makeRequest]);

  const post = useCallback((endpoint, data) => {
    return makeRequest(() => apiHelper.post(endpoint, data));
  }, [makeRequest]);

  const put = useCallback((endpoint, data) => {
    return makeRequest(() => apiHelper.put(endpoint, data));
  }, [makeRequest]);

  const remove = useCallback((endpoint) => {
    return makeRequest(() => apiHelper.delete(endpoint));
  }, [makeRequest]);

  const uploadFile = useCallback((endpoint, file, onProgress) => {
    return makeRequest(() => apiHelper.uploadFile(endpoint, file, onProgress));
  }, [makeRequest]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    clearError,
    get,
    post,
    put,
    delete: remove,
    uploadFile,
    makeRequest
  };
};

export default useAPI;