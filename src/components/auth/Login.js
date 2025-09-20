// Aura Voice AI - Login Component (Fixed for Supabase)
// ==================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Login Component
 * 
 * Professional login form for Supabase authentication
 * Integrates with AuthContext and handles redirects
 */
const Login = () => {
  // ✅ FIXED: Use signIn, signInWithGoogle instead of login
  const { signIn, signInWithGoogle, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Get redirect path from URL params
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  // Clear errors when component mounts or when starting to type
  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (formData.email || formData.password) {
      clearError();
      setFormErrors({});
    }
  }, [formData, clearError]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field-specific error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    clearError();
    setFormErrors({});

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ FIXED: Use signIn instead of login
      const result = await signIn(formData.email, formData.password);
      
      if (result.success) {
        // Login successful, navigation handled by useEffect above
        console.log('Login successful');
      } else {
        // Login failed, error is handled by AuthContext
        console.log('Login failed:', result.error);
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        console.log('Google sign in initiated');
      }
    } catch (err) {
      console.error('Google sign in error:', err);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Demo login (for testing purposes)
  const handleDemoLogin = async () => {
    setFormData({
      email: 'demo@iaura.ai',
      password: 'demo123'
    });
    // Auto-submit after a short delay
    setTimeout(() => {
      setFormData(prev => ({ ...prev }));
    }, 100);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <Link to="/" className="logo-link">
              <span className="logo-text">Aura</span>
            </Link>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">
              Sign in to your account to continue building amazing voice experiences
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Global Error Message */}
            {error && (
              <div className="alert alert-error">
                <div className="alert-icon">⚠️</div>
                <div className="alert-content">
                  <p className="alert-message">{error}</p>
                </div>
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="btn btn-google w-full"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="divider">
              <span className="divider-text">or</span>
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <div className="input-wrapper">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${formErrors.email ? 'error' : ''}`}
                  placeholder="Enter your email"
                />
                <div className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
              </div>
              {formErrors.email && (
                <p className="field-error">{formErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${formErrors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="field-error">{formErrors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" className="checkbox" />
                <span className="checkbox-text">Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="btn btn-primary btn-lg w-full"
            >
              {isSubmitting || isLoading ? (
                <>
                  <LoadingSpinner size="small" color="white" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Demo Button (Development only) */}
            {process.env.REACT_APP_ENVIRONMENT === 'development' && (
              <button
                type="button"
                onClick={handleDemoLogin}
                className="btn btn-secondary btn-sm w-full mt-3"
              >
                Demo Login
              </button>
            )}
          </form>

          {/* Footer */}
          <div className="login-footer">
            <p className="signup-text">
              Don't have an account?{' '}
              <Link to="/register" className="signup-link">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Side Content (optional) */}
        <div className="login-side">
          <div className="side-content">
            <div className="side-icon" aria-hidden="true">Insight</div>
            <h3 className="side-title">Join thousands of professionals</h3>
            <p className="side-description">
              Create intelligent voice AI assistants that understand your business 
              and speak exactly like you want them to.
            </p>
            
            <div className="side-features">
              <div className="side-feature">
                <span className="feature-check" aria-hidden="true">•</span>
                <span>Enterprise-grade security</span>
              </div>
                <div className="side-feature">
                  <span className="feature-check" aria-hidden="true">•</span>
                  <span>Sub-2-second response times</span>
                </div>
                <div className="side-feature">
                  <span className="feature-check" aria-hidden="true">•</span>
                  <span>Custom personality training</span>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, var(--gray-50) 0%, var(--white) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }

        .login-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1000px;
          width: 100%;
          background: var(--white);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          min-height: 600px;
        }

        .login-card {
          padding: var(--space-12) var(--space-8);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--space-8);
        }

        .logo-link {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          text-decoration: none;
          margin-bottom: var(--space-6);
        }

        .logo-text {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
        }

        .login-title {
          font-size: var(--text-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-2);
        }

        .login-subtitle {
          color: var(--gray-600);
          font-size: var(--text-base);
          line-height: 1.5;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .btn-google {
          background: var(--white);
          border: 1px solid var(--gray-300);
          color: var(--gray-700);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-lg);
          font-weight: var(--font-weight-medium);
          transition: all var(--transition-fast);
        }

        .btn-google:hover {
          background: var(--gray-50);
          border-color: var(--gray-400);
        }

        .divider {
          position: relative;
          text-align: center;
          margin: var(--space-4) 0;
        }

        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--gray-300);
        }

        .divider-text {
          background: var(--white);
          padding: 0 var(--space-4);
          color: var(--gray-500);
          font-size: var(--text-sm);
        }

        .alert {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-4);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-4);
        }

        .alert-error {
          background: var(--error-100);
          border: 1px solid var(--error-200);
        }

        .alert-icon {
          font-size: var(--text-lg);
          flex-shrink: 0;
        }

        .alert-message {
          color: var(--error-600);
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .form-label {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--gray-700);
        }

        .input-wrapper {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: var(--space-3) var(--space-4);
          padding-right: var(--space-12);
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-lg);
          font-size: var(--text-base);
          background: var(--white);
          transition: all var(--transition-fast);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary-600);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-input.error {
          border-color: var(--error-500);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .form-input::placeholder {
          color: var(--gray-400);
        }

        .input-icon {
          position: absolute;
          right: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400);
          pointer-events: none;
        }

        .password-toggle {
          position: absolute;
          right: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
          padding: var(--space-1);
          border-radius: var(--radius-sm);
          transition: color var(--transition-fast);
        }

        .password-toggle:hover {
          color: var(--gray-600);
        }

        .field-error {
          color: var(--error-500);
          font-size: var(--text-sm);
          margin-top: var(--space-1);
        }

        .form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: var(--space-2) 0;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
        }

        .checkbox {
          width: 16px;
          height: 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--gray-300);
        }

        .checkbox-text {
          font-size: var(--text-sm);
          color: var(--gray-600);
        }

        .forgot-link {
          font-size: var(--text-sm);
          color: var(--primary-600);
          text-decoration: none;
          font-weight: var(--font-weight-medium);
        }

        .forgot-link:hover {
          color: var(--primary-700);
          text-decoration: underline;
        }

        .w-full {
          width: 100%;
        }

        .mt-3 {
          margin-top: var(--space-3);
        }

        .login-footer {
          text-align: center;
          margin-top: var(--space-6);
          padding-top: var(--space-6);
          border-top: 1px solid var(--gray-200);
        }

        .signup-text {
          color: var(--gray-600);
          font-size: var(--text-sm);
        }

        .signup-link {
          color: var(--primary-600);
          text-decoration: none;
          font-weight: var(--font-weight-medium);
        }

        .signup-link:hover {
          color: var(--primary-700);
          text-decoration: underline;
        }

        /* Side Content */
        .login-side {
          background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
          padding: var(--space-12) var(--space-8);
          display: flex;
          align-items: center;
          color: var(--white);
        }

        .side-content {
          max-width: 400px;
        }

        .side-icon {
          font-size: 4rem;
          margin-bottom: var(--space-6);
        }

        .side-title {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-bold);
          margin-bottom: var(--space-4);
          line-height: 1.2;
        }

        .side-description {
          font-size: var(--text-base);
          line-height: 1.6;
          margin-bottom: var(--space-8);
          opacity: 0.9;
        }

        .side-features {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .side-feature {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--text-base);
        }

        .feature-check {
          font-size: var(--text-lg);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .login-container {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin: var(--space-4);
          }

          .login-side {
            display: none;
          }

          .login-card {
            padding: var(--space-8) var(--space-6);
          }

          .form-options {
            flex-direction: column;
            gap: var(--space-3);
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;