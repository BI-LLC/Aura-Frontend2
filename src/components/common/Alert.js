// Aura Voice AI - Alert Component
// ===============================

import React from 'react';

/**
 * Alert Component
 * 
 * Reusable alert component for showing messages, errors, warnings, etc.
 * Professional styling matching the Aura design system
 */
const Alert = ({
  type = 'info',
  title,
  message,
  children,
  onClose,
  className = '',
  icon,
  ...props
}) => {
  // Alert type configurations
  const alertTypes = {
    success: {
      containerClass: 'alert-success',
      icon: icon || '✅',
      iconColor: 'var(--success-500)'
    },
    error: {
      containerClass: 'alert-error', 
      icon: icon || '⚠️',
      iconColor: 'var(--error-500)'
    },
    warning: {
      containerClass: 'alert-warning',
      icon: icon || '⚠️',
      iconColor: 'var(--warning-500)'
    },
    info: {
      containerClass: 'alert-info',
      icon: icon || 'ℹ️',
      iconColor: 'var(--primary-500)'
    }
  };

  const config = alertTypes[type] || alertTypes.info;

  return (
    <div 
      className={`alert ${config.containerClass} ${className}`}
      role="alert"
      {...props}
    >
      <div className="alert-content">
        <div className="alert-icon" style={{ color: config.iconColor }}>
          {config.icon}
        </div>
        
        <div className="alert-text">
          {title && <div className="alert-title">{title}</div>}
          {message && <div className="alert-message">{message}</div>}
          {children && <div className="alert-children">{children}</div>}
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="alert-close"
            aria-label="Close alert"
          >
            ✕
          </button>
        )}
      </div>

      <style jsx>{`
        .alert {
          padding: var(--space-4);
          border-radius: var(--radius-lg);
          border: 1px solid;
          margin-bottom: var(--space-4);
          box-shadow: var(--shadow-sm);
        }

        .alert-content {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
        }

        .alert-icon {
          font-size: var(--text-lg);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .alert-text {
          flex: 1;
          min-width: 0;
        }

        .alert-title {
          font-weight: var(--font-weight-semibold);
          margin-bottom: var(--space-1);
          font-size: var(--text-base);
        }

        .alert-message {
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .alert-children {
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .alert-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: var(--space-1);
          border-radius: var(--radius-sm);
          font-size: var(--text-sm);
          color: inherit;
          opacity: 0.7;
          transition: opacity var(--transition-fast);
          flex-shrink: 0;
        }

        .alert-close:hover {
          opacity: 1;
        }

        /* Alert type styles */
        .alert-success {
          background: var(--success-100);
          border-color: var(--success-200);
          color: var(--success-800);
        }

        .alert-success .alert-title {
          color: var(--success-900);
        }

        .alert-error {
          background: var(--error-100);
          border-color: var(--error-200);
          color: var(--error-800);
        }

        .alert-error .alert-title {
          color: var(--error-900);
        }

        .alert-warning {
          background: var(--warning-100);
          border-color: var(--warning-200);
          color: var(--warning-800);
        }

        .alert-warning .alert-title {
          color: var(--warning-900);
        }

        .alert-info {
          background: var(--primary-100);
          border-color: var(--primary-200);
          color: var(--primary-800);
        }

        .alert-info .alert-title {
          color: var(--primary-900);
        }

        /* Responsive */
        @media (max-width: 640px) {
          .alert {
            padding: var(--space-3);
          }
          
          .alert-content {
            gap: var(--space-2);
          }
        }
      `}</style>
    </div>
  );
};

export default Alert;