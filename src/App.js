// Aura Voice AI - Main Application Component
// =========================================

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import LoadingSpinner from './components/common/LoadingSpinner';
import './styles/globals.css';

// Lazy load components for better performance
const Homepage = lazy(() => import('./components/home/Homepage'));
const ExplorePage = lazy(() => import('./components/explore/ExplorePage'));
const VoiceChat = lazy(() => import('./components/explore/VoiceChat'));
const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const ProtectedRoute = lazy(() => import('./components/common/ProtectedRoute'));

// Environment configuration
const isDevelopment = process.env.REACT_APP_ENVIRONMENT === 'development';
const isDebugMode = process.env.REACT_APP_DEBUG_MODE === 'true';

// Loading fallback component
const PageLoader = ({ message = 'Loading...' }) => (
  <div className="page-loader">
    <div className="container">
      <div className="loader-content">
        <LoadingSpinner size="large" />
        <p className="loader-text">{message}</p>
      </div>
    </div>
  </div>
);

// 404 Not Found component
const NotFound = () => (
  <div className="not-found-page">
    <div className="container">
      <div className="not-found-content">
        <div className="not-found-icon" aria-hidden="true">404</div>
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found-actions">
          <button 
            onClick={() => window.history.back()}
            className="btn btn-secondary"
          >
            ← Go Back
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="btn btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Main App Component
function App() {
  // Initialize app and log startup info
  useEffect(() => {
    if (isDebugMode) {
      console.log('Aura Voice AI App Started');
      console.log('Environment:', process.env.REACT_APP_ENVIRONMENT);
      console.log('API URL:', process.env.REACT_APP_API_BASE_URL);
      console.log('Debug Mode:', isDebugMode);
    }

    // Set up global app behaviors
    setupGlobalBehaviors();
  }, []);

  // Set up global app behaviors and utilities
  const setupGlobalBehaviors = () => {
    // Prevent right-click in production (optional security measure)
    if (!isDevelopment) {
      document.addEventListener('contextmenu', (e) => {
        // e.preventDefault(); // Uncomment if you want to disable right-click
      });
    }

    // Handle online/offline status
    const handleOnline = () => {
      if (isDebugMode) console.log('App is online');
      document.body.classList.remove('app-offline');
    };

    const handleOffline = () => {
      if (isDebugMode) console.log('App is offline');
      document.body.classList.add('app-offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    if (!navigator.onLine) {
      document.body.classList.add('app-offline');
    }

    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  return (
    <div className="App">
      {/* Router wrapper for navigation */}
      <Router>
        {/* Authentication context provider */}
        <AuthProvider>
          {/* Navigation bar */}
          <Navbar />
          
          {/* Offline status indicator */}
          <div className="offline-indicator">
            <div className="offline-message">
              You're offline. Some features may not work properly.
            </div>
          </div>

          {/* Main content area */}
          <main className="main-content">
            {/* Suspense wrapper for lazy-loaded components */}
            <Suspense fallback={<PageLoader message="Loading page..." />}>
              <Routes>
                {/* Public Routes */}
                <Route 
                  path="/" 
                  element={<Homepage />} 
                />
                
                <Route 
                  path="/explore" 
                  element={<ExplorePage />} 
                />
                
                <Route 
                  path="/chat/:slug" 
                  element={<VoiceChat />} 
                />

                {/* Authentication Routes */}
                <Route 
                  path="/login" 
                  element={
                    <Suspense fallback={<PageLoader message="Loading login..." />}>
                      <Login />
                    </Suspense>
                  } 
                />
                
                <Route 
                  path="/register" 
                  element={
                    <Suspense fallback={<PageLoader message="Loading registration..." />}>
                      <Register />
                    </Suspense>
                  } 
                />

                {/* Protected Routes */}
                <Route 
                  path="/dashboard/*" 
                  element={
                    <Suspense fallback={<PageLoader message="Loading dashboard..." />}>
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    </Suspense>
                  } 
                />

                {/* Redirect Routes for Better UX */}
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="/profile" element={<Navigate to="/dashboard" replace />} />
                <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
                
                {/* 404 Not Found Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>

          {/* Footer (optional) */}
          <footer className="app-footer">
            <div className="container">
              <div className="footer-content">
                <div className="footer-left">
                  <span className="footer-logo">Aura Voice AI</span>
                  <span className="footer-version">v{process.env.REACT_APP_VERSION}</span>
                </div>
                <div className="footer-right">
                  <a href="/privacy" className="footer-link">Privacy</a>
                  <a href="/terms" className="footer-link">Terms</a>
                  <a href="/support" className="footer-link">Support</a>
                </div>
              </div>
            </div>
          </footer>

          {/* Development tools (only in dev mode) */}
          {isDevelopment && (
            <div className="dev-tools">
              <div className="dev-info">
                <span>Dev Mode</span>
                <span>API: {process.env.REACT_APP_API_BASE_URL}</span>
              </div>
            </div>
          )}

          {/* Global toast notifications container */}
          <div id="toast-container" className="toast-container">
            {/* Toast notifications will be inserted here */}
          </div>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;