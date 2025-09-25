// Aura Voice AI - useAuth Hook
// ============================

import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

/**
 * useAuth Hook
 * 
 * Custom hook to access authentication context
 * Provides a clean interface to auth state and methods
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth;