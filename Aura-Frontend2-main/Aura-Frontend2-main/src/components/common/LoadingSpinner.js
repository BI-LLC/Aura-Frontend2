// Aura Voice AI - Loading Spinner Component
// ========================================

import React from 'react';

/**
 * LoadingSpinner Component
 * 
 * A reusable loading spinner component with different sizes and variants
 * Perfect for showing loading states throughout the application
 * 
 * @param {string} size - Size variant: 'small', 'medium', 'large' (default: 'medium')
 * @param {string} color - Color variant: 'primary', 'secondary', 'white' (default: 'primary')
 * @param {string} message - Optional loading message to display below spinner
 * @param {boolean} overlay - Whether to show as full-screen overlay (default: false)
 * @param {string} className - Additional CSS classes
 */
const LoadingSpinner = ({
  size = 'medium',
  color = 'primary',
  message = '',
  overlay = false,
  className = '',
  ...props
}) => {
  // Size configurations
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-6 h-6 border-2',
    large: 'w-10 h-10 border-4'
  };

  // Color configurations
  const colorClasses = {
    primary: 'border-gray-300 border-t-primary-600',
    secondary: 'border-gray-200 border-t-gray-600', 
    white: 'border-white/30 border-t-white',
    success: 'border-gray-300 border-t-success-500',
    error: 'border-gray-300 border-t-error-500'
  };

  // Base spinner classes
  const baseClasses = [
    'loading-spinner',
    'inline-block',
    'rounded-full',
    'animate-spin'
  ];

  // Combine classes
  const spinnerClasses = [
    ...baseClasses,
    sizeClasses[size] || sizeClasses.medium,
    colorClasses[color] || colorClasses.primary,
    className
  ].join(' ');

  // Message size based on spinner size
  const messageSize = {
    small: 'text-sm',
    medium: 'text-base', 
    large: 'text-lg'
  };

  // If overlay mode, render full-screen overlay
  if (overlay) {
    return (
      <div 
        className="loading-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        {...props}
      >
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm mx-4 text-center">
          <div className="flex justify-center mb-4">
            <div className={spinnerClasses} />
          </div>
          {message && (
            <p className={`text-gray-600 ${messageSize[size]}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Regular inline spinner
  return (
    <div className="loading-container flex flex-col items-center" {...props}>
      <div className={spinnerClasses} />
      {message && (
        <p className={`mt-3 text-gray-500 ${messageSize[size]} text-center`}>
          {message}
        </p>
      )}
    </div>
  );
};

/**
 * Specialized Loading Components for common use cases
 */

// Page loading spinner (large, centered)
export const PageLoader = ({ message = "Loading page..." }) => (
  <div className="page-loader min-h-screen flex items-center justify-center">
    <LoadingSpinner 
      size="large" 
      message={message}
      className="mx-auto"
    />
  </div>
);

// Button loading spinner (small, inline)
export const ButtonLoader = ({ className = "" }) => (
  <LoadingSpinner 
    size="small" 
    color="white"
    className={`mr-2 ${className}`}
  />
);

// Card loading spinner (medium, centered in card)
export const CardLoader = ({ message = "Loading..." }) => (
  <div className="card-loader py-12 text-center">
    <LoadingSpinner 
      size="medium" 
      message={message}
    />
  </div>
);

// Inline text loading (small, inline with text)
export const InlineLoader = () => (
  <LoadingSpinner 
    size="small" 
    className="inline-block ml-2 align-middle"
  />
);

// Voice processing loader (with pulse animation)
export const VoiceLoader = ({ isRecording = false }) => (
  <div className="voice-loader text-center">
    <div className={`
      w-20 h-20 rounded-full border-4 mx-auto mb-4
      ${isRecording 
        ? 'border-error-300 border-t-error-500 animate-pulse' 
        : 'border-primary-300 border-t-primary-600'
      }
      animate-spin
    `} />
    <p className="text-gray-600">
      {isRecording ? 'Recording...' : 'Processing voice...'}
    </p>
  </div>
);

// Data loading skeleton (for lists and grids)
export const SkeletonLoader = ({ 
  lines = 3, 
  avatar = false, 
  className = "" 
}) => (
  <div className={`skeleton-loader animate-pulse ${className}`}>
    <div className="flex items-start space-x-4">
      {avatar && (
        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
      )}
      <div className="flex-1 space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          <div 
            key={index}
            className={`h-4 bg-gray-200 rounded ${
              index === lines - 1 ? 'w-3/4' : 'w-full'
            }`} 
          />
        ))}
      </div>
    </div>
  </div>
);

// Upload progress loader
export const UploadLoader = ({ 
  progress = 0, 
  fileName = "Uploading file..." 
}) => (
  <div className="upload-loader bg-white border border-gray-200 rounded-lg p-4">
    <div className="flex items-center mb-3">
      <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mr-3" />
      <div>
        <p className="font-medium text-gray-900">{fileName}</p>
        <p className="text-sm text-gray-500">{progress}% complete</p>
      </div>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

// Loading states for specific features
export const ChatLoader = () => (
  <div className="chat-loader flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
    </div>
    <span className="text-gray-500 text-sm">AI is thinking...</span>
  </div>
);

// Training progress loader
export const TrainingLoader = ({ 
  step = "Processing", 
  totalSteps = 3,
  currentStep = 1
}) => (
  <div className="training-loader bg-white border border-gray-200 rounded-lg p-6">
    <div className="text-center mb-4">
      <LoadingSpinner size="large" message={`${step}...`} />
    </div>
    <div className="flex justify-center space-x-2 mb-3">
      {Array.from({ length: totalSteps }, (_, index) => (
        <div 
          key={index}
          className={`w-3 h-3 rounded-full ${
            index + 1 <= currentStep ? 'bg-primary-600' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
    <p className="text-center text-sm text-gray-600">
      Step {currentStep} of {totalSteps}
    </p>
  </div>
);

export default LoadingSpinner;