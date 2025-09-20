// Aura Voice AI - Authentication Context (Supabase-based)
// ========================================================

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const isDebugMode = process.env.REACT_APP_DEBUG_MODE === 'true';

// Initialize Supabase client
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('Missing Supabase configuration. Check your environment variables.');
}

// Authentication states
const AuthStates = {
  IDLE: 'idle',
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error'
};

// Initial state
const initialState = {
  user: null,
  session: null,
  status: AuthStates.LOADING,
  error: null,
  isInitialized: false
};

// Action types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED', 
  SET_UNAUTHENTICATED: 'SET_UNAUTHENTICATED',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
  SET_INITIALIZED: 'SET_INITIALIZED'
};

// Auth reducer
function authReducer(state, action) {
  if (isDebugMode) {
    console.log('🔐 Auth Action:', action.type, action.payload);
  }

  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        status: AuthStates.LOADING,
        error: null
      };

    case ActionTypes.SET_AUTHENTICATED:
      return {
        ...state,
        user: action.payload.user,
        session: action.payload.session,
        status: AuthStates.AUTHENTICATED,
        error: null
      };

    case ActionTypes.SET_UNAUTHENTICATED:
      return {
        ...state,
        user: null,
        session: null,
        status: AuthStates.UNAUTHENTICATED,
        error: null
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        status: AuthStates.ERROR,
        error: action.payload
      };

    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        status: state.user ? AuthStates.AUTHENTICATED : AuthStates.UNAUTHENTICATED
      };

    case ActionTypes.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    case ActionTypes.SET_INITIALIZED:
      return {
        ...state,
        isInitialized: true
      };

    default:
      return state;
  }
}

// Create Auth Context
const AuthContext = createContext(null);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication on app start
  useEffect(() => {
    if (!supabase) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: 'Supabase not configured' });
      return;
    }

    initializeAuth();
    setupAuthListener();
  }, []);

  // Set up axios interceptor to add Supabase JWT to API calls
  useEffect(() => {
    setupAxiosInterceptor();
  }, [state.session]);

  // Initialize authentication
  const initializeAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        dispatch({ type: ActionTypes.SET_UNAUTHENTICATED });
      } else if (session?.user) {
        dispatch({
          type: ActionTypes.SET_AUTHENTICATED,
          payload: { user: session.user, session }
        });
      } else {
        dispatch({ type: ActionTypes.SET_UNAUTHENTICATED });
      }
    } catch (error) {
      console.error('Authentication initialization failed:', error);
      dispatch({ type: ActionTypes.SET_ERROR, payload: 'Failed to initialize authentication' });
    } finally {
      dispatch({ type: ActionTypes.SET_INITIALIZED });
    }
  };

  // Set up Supabase auth state listener
  const setupAuthListener = () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isDebugMode) {
          console.log('🔐 Supabase auth event:', event, session);
        }

        if (session?.user) {
          dispatch({
            type: ActionTypes.SET_AUTHENTICATED,
            payload: { user: session.user, session }
          });
        } else {
          dispatch({ type: ActionTypes.SET_UNAUTHENTICATED });
        }
      }
    );

    return () => subscription?.unsubscribe();
  };

  // Set up axios interceptor to automatically add JWT to API calls
  const setupAxiosInterceptor = () => {
    // Remove existing interceptor
    axios.interceptors.request.eject(axios.interceptors.request.use);

    // Add new interceptor
    axios.interceptors.request.use(
      (config) => {
        // Add Supabase JWT to requests to your backend
        if (state.session?.access_token && config.url?.includes(API_BASE_URL)) {
          config.headers.Authorization = `Bearer ${state.session.access_token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for handling auth errors
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, sign out user
          await signOut();
        }
        return Promise.reject(error);
      }
    );
  };

  // Sign up with email/password
  const signUp = async (email, password, userData = {}) => {
    dispatch({ type: ActionTypes.SET_LOADING });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name || '',
            ...userData
          }
        }
      });

      if (error) throw error;

      if (isDebugMode) {
        console.log('✅ Sign up successful:', data);
      }

      return { 
        success: true, 
        user: data.user,
        message: data.user?.email_confirmed_at 
          ? 'Account created successfully!'
          : 'Please check your email to confirm your account.'
      };

    } catch (error) {
      const errorMessage = error.message || 'Sign up failed. Please try again.';
      
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: errorMessage
      });

      if (isDebugMode) {
        console.error('❌ Sign up failed:', error);
      }

      return { success: false, error: errorMessage };
    }
  };

  // Sign in with email/password
  const signIn = async (email, password) => {
    dispatch({ type: ActionTypes.SET_LOADING });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (isDebugMode) {
        console.log('✅ Sign in successful:', data.user);
      }

      return { success: true, user: data.user };

    } catch (error) {
      const errorMessage = error.message || 'Sign in failed. Please try again.';
      
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: errorMessage
      });

      if (isDebugMode) {
        console.error('❌ Sign in failed:', error);
      }

      return { success: false, error: errorMessage };
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    dispatch({ type: ActionTypes.SET_LOADING });
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      if (isDebugMode) {
        console.log('✅ Google sign in initiated');
      }

      return { success: true };

    } catch (error) {
      const errorMessage = error.message || 'Google sign in failed. Please try again.';
      
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      }

      if (isDebugMode) {
        console.log('✅ Sign out successful');
      }

      return { success: true };

    } catch (error) {
      console.error('Sign out failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Update user profile
  const updateUser = async (userData) => {
    if (!state.user) {
      throw new Error('Not authenticated');
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: userData
      });

      if (error) throw error;

      dispatch({
        type: ActionTypes.UPDATE_USER,
        payload: data.user
      });

      return { success: true, user: data.user };

    } catch (error) {
      const errorMessage = error.message || 'Update failed';
      return { success: false, error: errorMessage };
    }
  };

  // Change password
  const changePassword = async (newPassword) => {
    if (!state.user) {
      throw new Error('Not authenticated');
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { success: true, message: 'Password changed successfully' };

    } catch (error) {
      const errorMessage = error.message || 'Password change failed';
      return { success: false, error: errorMessage };
    }
  };

  // Send password reset email
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      return { 
        success: true, 
        message: 'Password reset email sent. Please check your inbox.' 
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Failed to send reset email' 
      };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: ActionTypes.CLEAR_ERROR });
  };

  // Get current JWT token
  const getToken = () => {
    return state.session?.access_token || null;
  };

  // Check if user has specific role/permission
  const hasRole = (role) => {
    return state.user?.user_metadata?.role === role || 
           state.user?.app_metadata?.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return hasRole('admin') || hasRole('owner');
  };

  // Get user's metadata
  const getUserMetadata = () => {
    return {
      ...state.user?.user_metadata,
      ...state.user?.app_metadata
    };
  };

  // Context value
  const value = {
    // State
    user: state.user,
    session: state.session,
    status: state.status,
    error: state.error,
    isInitialized: state.isInitialized,
    
    // Computed state
    isAuthenticated: state.status === AuthStates.AUTHENTICATED,
    isLoading: state.status === AuthStates.LOADING,
    isError: state.status === AuthStates.ERROR,
    
    // Actions
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateUser,
    changePassword,
    resetPassword,
    clearError,
    
    // Utilities
    hasRole,
    isAdmin,
    getUserMetadata,
    getToken,
    
    // Supabase instance (for direct database queries)
    supabase
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Higher-order component for requiring authentication
export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading, isInitialized } = useAuth();
    
    if (!isInitialized || isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="loading-spinner large mb-4" />
            <p>Loading...</p>
          </div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please login to access this page.</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="btn btn-primary"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

// Auth status constants (for external use)
export { AuthStates };

export default AuthContext;