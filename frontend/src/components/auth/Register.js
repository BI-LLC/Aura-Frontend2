// Aura Voice AI - Registration Component (Fixed for Supabase)
// ==========================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Register Component
 * 
 * Professional registration form for Supabase authentication
 * Optimized for business user onboarding
 */
const Register = () => {
  // ✅ FIXED: Use signUp, signInWithGoogle instead of register
  const { signUp, signInWithGoogle, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    acceptTerms: false
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component mounts or when starting to type
  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (Object.values(formData).some(value => value)) {
      clearError();
      setFormErrors({});
    }
  }, [formData, clearError]);

  // Password strength checker
  const checkPasswordStrength = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    const feedback = [];

    if (!checks.length) feedback.push('At least 8 characters');
    if (!checks.uppercase) feedback.push('One uppercase letter');
    if (!checks.lowercase) feedback.push('One lowercase letter');
    if (!checks.numbers) feedback.push('One number');
    if (!checks.symbols) feedback.push('One special character');

    return { score, feedback };
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));

    // Check password strength
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }

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

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength.score < 3) {
      errors.password = 'Password is too weak. Please choose a stronger password.';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Terms acceptance validation
    if (!formData.acceptTerms) {
      errors.acceptTerms = 'You must accept the terms and conditions';
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
      // ✅ FIXED: Use signUp with proper Supabase format
      const result = await signUp(
        formData.email, 
        formData.password, 
        {
          name: formData.name,
          company: formData.company
        }
      );
      
      if (result.success) {
        setRegistrationSuccess(true);
        // Show success message with email confirmation info
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: result.message || 'Registration successful! Please check your email to confirm your account.',
              email: formData.email
            }
          });
        }, 3000);
      }
    } catch (err) {
      console.error('Registration error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google Sign Up
  const handleGoogleSignUp = async () => {
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        console.log('Google sign up initiated');
      }
    } catch (err) {
      console.error('Google sign up error:', err);
    }
  };

  // Get password strength color
  const getPasswordStrengthColor = (score) => {
    if (score <= 1) return 'var(--error-500)';
    if (score <= 2) return 'var(--warning-500)';
    if (score <= 3) return 'var(--warning-500)';
    return 'var(--success-500)';
  };

  // Get password strength label
  const getPasswordStrengthLabel = (score) => {
    if (score <= 1) return 'Very Weak';
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score <= 4) return 'Good';
    return 'Strong';
  };

  // Show success screen
  if (registrationSuccess) {
    return (
      <div className="register-page">
        <div className="success-container">
          <div className="success-card">
            <div className="success-icon" aria-hidden="true">Success</div>
            <h1 className="success-title">Registration Successful!</h1>
            <p className="success-message">
              Welcome to Aura! We've sent a confirmation email to <strong>{formData.email}</strong>. 
              Please check your inbox and click the confirmation link to activate your account.
            </p>
            <div className="success-actions">
              <Link to="/login" className="btn btn-primary btn-lg">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          {/* Header */}
          <div className="register-header">
            <Link to="/" className="logo-link">
              <span className="logo-text">Aura</span>
            </Link>
            <h1 className="register-title">Create your account</h1>
            <p className="register-subtitle">
              Join thousands of professionals building intelligent voice experiences
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="register-form" noValidate>
            {/* Global Error Message */}
            {error && (
              <div className="alert alert-error">
                <div className="alert-icon">⚠️</div>
                <div className="alert-content">
                  <p className="alert-message">{error}</p>
                </div>
              </div>
            )}

            {/* Google Sign Up Button */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
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

            {/* Name Field */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full name *
              </label>
              <div className="input-wrapper">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={`form-input ${formErrors.name ? 'error' : ''}`}
                  placeholder="Enter your full name"
                />
                <div className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>
              {formErrors.name && (
                <p className="field-error">{formErrors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address *
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

            {/* Company Field (Optional) */}
            <div className="form-group">
              <label htmlFor="company" className="form-label">
                Company <span className="optional">(optional)</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="company"
                  name="company"
                  type="text"
                  autoComplete="organization"
                  value={formData.company}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your company name"
                />
                <div className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18" />
                    <path d="M5 21V7l8-4v18" />
                    <path d="M19 21V11l-6-4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password *
              </label>
              <div className="input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${formErrors.password ? 'error' : ''}`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill" 
                      style={{ 
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        backgroundColor: getPasswordStrengthColor(passwordStrength.score)
                      }}
                    />
                  </div>
                  <div className="strength-label">
                    <span 
                      style={{ color: getPasswordStrengthColor(passwordStrength.score) }}
                    >
                      {getPasswordStrengthLabel(passwordStrength.score)}
                    </span>
                    {passwordStrength.feedback.length > 0 && (
                      <span className="strength-feedback">
                        Missing: {passwordStrength.feedback.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {formErrors.password && (
                <p className="field-error">{formErrors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm password *
              </label>
              <div className="input-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`form-input ${formErrors.confirmPassword ? 'error' : ''}`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
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
              {formErrors.confirmPassword && (
                <p className="field-error">{formErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms Acceptance */}
            <div className="form-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className={`checkbox ${formErrors.acceptTerms ? 'error' : ''}`}
                />
                <span className="checkbox-text">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="terms-link">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" target="_blank" className="terms-link">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {formErrors.acceptTerms && (
                <p className="field-error">{formErrors.acceptTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg w-full"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" color="white" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="register-footer">
            <p className="login-text">
              Already have an account?{' '}
              <Link to="/login" className="login-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Side Content */}
        <div className="register-side">
          <div className="side-content">
            <div className="side-icon" aria-hidden="true">Insight</div>
            <h3 className="side-title">Build the future of voice AI</h3>
            <p className="side-description">
              Create intelligent voice assistants that understand your business, 
              learn from your data, and speak exactly like your brand.
            </p>
            
            <div className="side-stats">
              <div className="side-stat">
                <div className="stat-number">10K+</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="side-stat">
                <div className="stat-number">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
              <div className="side-stat">
                <div className="stat-number">{'< 2s'}</div>
                <div className="stat-label">Response Time</div>
              </div>
            </div>

              <div className="side-features">
                <div className="side-feature">
                  <span className="feature-check" aria-hidden="true">•</span>
                  <span>Enterprise-grade security</span>
                </div>
                <div className="side-feature">
                  <span className="feature-check" aria-hidden="true">•</span>
                  <span>Custom personality training</span>
                </div>
                <div className="side-feature">
                  <span className="feature-check" aria-hidden="true">•</span>
                  <span>Real-time analytics</span>
                </div>
                <div className="side-feature">
                  <span className="feature-check" aria-hidden="true">•</span>
                  <span>Easy integration</span>
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Styles - Same as original with Google button styles added */}
      <style jsx>{`
        .register-page {
          min-height: 100vh;
          background: linear-gradient(135deg, var(--gray-50) 0%, var(--white) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }

        .register-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1200px;
          width: 100%;
          background: var(--white);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          min-height: 700px;
        }

        .register-card {
          padding: var(--space-8) var(--space-8);
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-height: 100vh;
          overflow-y: auto;
        }

        .register-header {
          text-align: center;
          margin-bottom: var(--space-6);
        }

          .logo-link {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2);
            text-decoration: none;
            margin-bottom: var(--space-4);
          }

        .logo-text {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
        }

        .register-title {
          font-size: var(--text-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-2);
        }

        .register-subtitle {
          color: var(--gray-600);
          font-size: var(--text-base);
          line-height: 1.5;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
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

        .optional {
          color: var(--gray-400);
          font-weight: var(--font-weight-normal);
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

        .password-strength {
          margin-top: var(--space-2);
        }

        .strength-bar {
          height: 4px;
          background: var(--gray-200);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: var(--space-1);
        }

        .strength-fill {
          height: 100%;
          transition: all var(--transition-normal);
        }

        .strength-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--text-xs);
        }

        .strength-feedback {
          color: var(--gray-500);
        }

        .field-error {
          color: var(--error-500);
          font-size: var(--text-sm);
          margin-top: var(--space-1);
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          cursor: pointer;
          line-height: 1.5;
        }

        .checkbox {
          width: 18px;
          height: 18px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--gray-300);
          margin-top: 2px;
          flex-shrink: 0;
        }

        .checkbox.error {
          border-color: var(--error-500);
        }

        .checkbox-text {
          font-size: var(--text-sm);
          color: var(--gray-600);
        }

        .terms-link {
          color: var(--primary-600);
          text-decoration: none;
          font-weight: var(--font-weight-medium);
        }

        .terms-link:hover {
          color: var(--primary-700);
          text-decoration: underline;
        }

        .w-full {
          width: 100%;
        }

        .register-footer {
          text-align: center;
          margin-top: var(--space-6);
          padding-top: var(--space-6);
          border-top: 1px solid var(--gray-200);
        }

        .login-text {
          color: var(--gray-600);
          font-size: var(--text-sm);
        }

        .login-link {
          color: var(--primary-600);
          text-decoration: none;
          font-weight: var(--font-weight-medium);
        }

        .login-link:hover {
          color: var(--primary-700);
          text-decoration: underline;
        }

        /* Success Screen */
        .success-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }

        .success-card {
          background: var(--white);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          padding: var(--space-16);
          text-align: center;
          max-width: 500px;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: var(--space-6);
        }

        .success-title {
          font-size: var(--text-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-4);
        }

        .success-message {
          color: var(--gray-600);
          font-size: var(--text-lg);
          line-height: 1.6;
          margin-bottom: var(--space-8);
        }

        .success-actions {
          display: flex;
          justify-content: center;
        }

        /* Side Content */
        .register-side {
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

        .side-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }

        .side-stat {
          text-align: center;
        }

        .stat-number {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-bold);
          margin-bottom: var(--space-1);
        }

        .stat-label {
          font-size: var(--text-xs);
          opacity: 0.8;
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
          font-size: var(--text-sm);
        }

        .feature-check {
          font-size: var(--text-base);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .register-container {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin: var(--space-4);
          }

          .register-side {
            display: none;
          }

          .register-card {
            padding: var(--space-6) var(--space-4);
          }

          .checkbox-label {
            align-items: flex-start;
          }

          .strength-label {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-1);
          }
        }
      `}</style>
    </div>
  );
};

export default Register;