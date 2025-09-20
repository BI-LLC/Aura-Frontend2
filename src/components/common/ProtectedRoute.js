// Aura Voice AI - Protected Route Component
// ========================================

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute Component
 * 
 * Handles route protection for authenticated users
 * Redirects to login if user is not authenticated
 * Shows loading state during authentication check
 * 
 * @param {React.ReactNode} children - Components to render if authenticated
 * @param {string} redirectTo - Where to redirect unauthenticated users (default: '/login')
 * @param {string[]} requiredRoles - Required user roles to access route
 * @param {boolean} requireEmailVerification - Whether email verification is required
 * @param {React.ReactNode} fallback - Custom fallback component for unauthorized access
 */
const ProtectedRoute = ({ 
  children, 
  redirectTo = '/login',
  requiredRoles = [],
  requireEmailVerification = false,
  fallback = null
}) => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isInitialized,
    hasRole 
  } = useAuth();
  
  const location = useLocation();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Wait for auth initialization
  useEffect(() => {
    if (isInitialized) {
      setHasCheckedAuth(true);
    }
  }, [isInitialized]);

  // Show loading state while checking authentication
  if (!hasCheckedAuth || isLoading) {
    return (
      <div className="protected-route-loading">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600 text-lg">
              Verifying access...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    // Store the attempted location for redirect after login
    const redirectPath = location.pathname + location.search;
    
    return (
      <Navigate 
        to={`${redirectTo}?redirect=${encodeURIComponent(redirectPath)}`} 
        replace 
      />
    );
  }

  // Check role-based access if roles are required
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    
    if (!hasRequiredRole) {
      return fallback || (
        <UnauthorizedAccess 
          requiredRoles={requiredRoles}
          userRole={user?.role}
        />
      );
    }
  }

  // Check email verification if required
  if (requireEmailVerification && !user?.email_verified) {
    return <EmailVerificationRequired />;
  }

  // User is authenticated and authorized, render children
  return <>{children}</>;
};

/**
 * Unauthorized Access Component
 * Shown when user doesn't have required permissions
 */
const UnauthorizedAccess = ({ requiredRoles, userRole }) => (
  <div className="unauthorized-access">
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg 
                className="h-8 w-8 text-red-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Required:</span> {requiredRoles.join(' or ')}
              </p>
              {userRole && (
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">Your role:</span> {userRole}
                </p>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="btn btn-secondary w-full"
            >
              ← Go Back
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="btn btn-primary w-full"
            >
              🏠 Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Email Verification Required Component
 * Shown when user needs to verify their email
 */
const EmailVerificationRequired = () => {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendMessage('');

    try {
      // Call your API to resend verification email
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem(process.env.REACT_APP_TOKEN_STORAGE_KEY)}`
        }
      });

      if (response.ok) {
        setResendMessage('Verification email sent! Please check your inbox.');
      } else {
        setResendMessage('Failed to send verification email. Please try again.');
      }
    } catch (error) {
      setResendMessage('Network error. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="email-verification-required">
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <svg 
                  className="h-8 w-8 text-yellow-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Verification Required
              </h2>
              <p className="text-gray-600 mb-4">
                Please verify your email address to continue.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  We sent a verification email to:
                </p>
                <p className="font-medium text-gray-900 mt-1">
                  {user?.email}
                </p>
              </div>
            </div>
            
            {resendMessage && (
              <div className={`mb-4 p-3 rounded-md text-sm ${
                resendMessage.includes('sent') 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {resendMessage}
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="btn btn-primary w-full"
              >
                {isResending ? (
                  <>
                    <LoadingSpinner size="small" color="white" />
                    Sending...
                  </>
                ) : (
                  '📧 Resend Verification Email'
                )}
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn btn-secondary w-full"
              >
                🏠 Go Home
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              Check your spam folder if you don't see the email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Higher-order component version of ProtectedRoute
 * Usage: export default withProtection(MyComponent, { requiredRoles: ['admin'] })
 */
export const withProtection = (Component, options = {}) => {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

/**
 * Hook to check if current user can access a route
 * Usage: const canAccess = useCanAccess({ requiredRoles: ['admin'] })
 */
export const useCanAccess = ({ 
  requiredRoles = [], 
  requireEmailVerification = false 
} = {}) => {
  const { 
    user, 
    isAuthenticated, 
    hasRole 
  } = useAuth();

  if (!isAuthenticated) {
    return { canAccess: false, reason: 'not_authenticated' };
  }

  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return { canAccess: false, reason: 'insufficient_role' };
    }
  }

  if (requireEmailVerification && !user?.email_verified) {
    return { canAccess: false, reason: 'email_not_verified' };
  }

  return { canAccess: true, reason: null };
};

/**
 * Admin-only route wrapper
 */
export const AdminRoute = ({ children, fallback }) => (
  <ProtectedRoute 
    requiredRoles={['admin', 'owner']} 
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

/**
 * Owner-only route wrapper
 */
export const OwnerRoute = ({ children, fallback }) => (
  <ProtectedRoute 
    requiredRoles={['owner']} 
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;