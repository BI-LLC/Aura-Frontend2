// Aura Voice AI - Frontend Entry Point
// ===================================

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Environment and configuration
const isDevelopment = process.env.REACT_APP_ENVIRONMENT === 'development';
const isDebugMode = process.env.REACT_APP_DEBUG_MODE === 'true';

// Global error boundary component for production stability
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state to render the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // In production, you might want to send this to an error tracking service
    if (!isDevelopment) {
      console.error('Application Error:', error);
      // Example: Send to Sentry, LogRocket, etc.
      // Sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom error fallback UI
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '2rem',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>Aura</div>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Oops! Something went wrong
          </h1>
          <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.9 }}>
            We're experiencing a technical issue. Please refresh the page or try again later.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50px',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Refresh Page
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50px',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Go Home
            </button>
          </div>
          
          {/* Show error details in development */}
          {isDevelopment && this.state.error && (
            <details style={{ 
              marginTop: '2rem', 
              maxWidth: '600px', 
              textAlign: 'left',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '1rem' }}>
                Error Details (Development Mode)
              </summary>
              <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto' }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Performance monitoring function
function measurePerformance() {
  if (typeof window !== 'undefined' && window.performance) {
    // Log Core Web Vitals and other performance metrics
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      
      if (isDebugMode) {
          console.log('Performance Metrics:');
        console.log(`- DOM Content Loaded: ${perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart}ms`);
        console.log(`- Page Load Complete: ${perfData.loadEventEnd - perfData.loadEventStart}ms`);
        console.log(`- Total Load Time: ${perfData.loadEventEnd - perfData.fetchStart}ms`);
      }

      // You can send these metrics to analytics services
      // Example: gtag('event', 'timing_complete', { name: 'load', value: loadTime });
    });

    // Measure and log Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        if (isDebugMode) {
          console.log(`LCP: ${lastEntry.startTime}ms`);
        }
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  }
}

// App initialization function
function initializeApp() {
  // Get the root DOM element
  const container = document.getElementById('root');
  
  if (!container) {
    console.error('Could not find root element. Make sure your HTML has <div id="root"></div>');
    return;
  }

  // Create React root
  const root = createRoot(container);

  // Development mode enhancements
  if (isDevelopment) {
    console.log('Aura Voice AI - Development Mode');
    console.log('Debug mode:', isDebugMode);
    console.log('Environment variables loaded:', {
      API_URL: process.env.REACT_APP_API_BASE_URL,
      SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL ? 'Set' : 'Missing',
      DEBUG_MODE: isDebugMode
    });

    // Enable React DevTools profiler
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools detected');
    }
  }

  // Render the app with error boundary
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Initialize performance monitoring
  measurePerformance();

  // Hide loading screen (if still visible)
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        if (loadingScreen.parentNode) {
          loadingScreen.parentNode.removeChild(loadingScreen);
        }
      }, 500);
    }, 500);
  }

  // Log successful initialization
  if (isDebugMode) {
    console.log('Aura Voice AI initialized successfully');
  }
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  
  // Prevent the default behavior (logging to console)
  event.preventDefault();
  
  // In production, you might want to send this to an error tracking service
  if (!isDevelopment) {
    // Example: Sentry.captureException(event.reason);
  }
});

// Global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('🚨 Global Error:', event.error);
  
  if (!isDevelopment) {
    // Example: Sentry.captureException(event.error);
  }
});

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator && !isDevelopment) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((registrationError) => {
        console.log('Service Worker registration failed:', registrationError);
      });
  });
}

// Initialize the application
initializeApp();

// Hot module replacement for development
if (isDevelopment && module.hot) {
  module.hot.accept('./App', () => {
    console.log('Hot reloading App component');
    initializeApp();
  });
}