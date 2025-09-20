// Aura Voice AI - Navigation Bar Component
// =======================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Navbar Component
 * 
 * Professional navigation bar with authentication integration
 * Responsive design optimized for Silicon Valley professionals
 */
const Navbar = () => {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Local state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Refs
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Handle scroll effect for navbar background
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  // Check if current path is active
  const isActivePath = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Navigation items for authenticated users
  const authenticatedNavItems = [
    { path: '/', label: 'Home' },
    { path: '/explore', label: 'Explore' },
    { path: '/dashboard', label: 'Dashboard' }
  ];

  // Navigation items for unauthenticated users
  const publicNavItems = [
    { path: '/', label: 'Home' },
    { path: '/explore', label: 'Explore' }
  ];

  const navItems = isAuthenticated ? authenticatedNavItems : publicNavItems;

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
        <div className="container">
          <div className="nav-content">
            {/* Logo */}
            <Link to="/" className="logo">
              <span className="logo-icon">🎤</span>
              <span className="logo-text">Aura</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="nav-center hidden md:flex">
              <div className="nav-links">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link ${isActivePath(item.path) ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop Auth Section */}
            <div className="nav-auth hidden md:flex">
              {isLoading ? (
                <div className="nav-loading">
                  <div className="loading-spinner small" />
                </div>
              ) : isAuthenticated ? (
                <div className="user-menu-container" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="user-menu-trigger"
                  >
                    <div className="user-avatar">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="user-name">{user?.name || 'User'}</span>
                    <svg
                      className={`chevron ${isUserMenuOpen ? 'rotated' : ''}`}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6,9 12,15 18,9" />
                    </svg>
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="user-menu-dropdown">
                      <div className="user-menu-header">
                        <div className="user-menu-avatar">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="user-menu-info">
                          <div className="user-menu-name">{user?.name}</div>
                          <div className="user-menu-email">{user?.email}</div>
                        </div>
                      </div>
                      
                      <div className="user-menu-divider" />
                      
                      <div className="user-menu-items">
                        <Link to="/dashboard" className="user-menu-item">
                          <span className="menu-item-icon">📊</span>
                          Dashboard
                        </Link>
                        <Link to="/dashboard" className="user-menu-item">
                          <span className="menu-item-icon">⚙️</span>
                          Settings
                        </Link>
                        <button onClick={handleLogout} className="user-menu-item logout-item">
                          <span className="menu-item-icon">🚪</span>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="auth-buttons">
                  <Link to="/login" className="btn btn-ghost btn-sm">
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-sm">
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="mobile-menu-button md:hidden"
              aria-label="Toggle mobile menu"
            >
              <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="mobile-menu md:hidden" ref={mobileMenuRef}>
            <div className="mobile-menu-content">
              {/* Mobile Navigation Links */}
              <div className="mobile-nav-links">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`mobile-nav-link ${isActivePath(item.path) ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Mobile Auth Section */}
              <div className="mobile-auth">
                {isLoading ? (
                  <div className="mobile-loading">
                    <div className="loading-spinner" />
                    <span>Loading...</span>
                  </div>
                ) : isAuthenticated ? (
                  <div className="mobile-user-section">
                    <div className="mobile-user-info">
                      <div className="mobile-user-avatar">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="mobile-user-name">{user?.name}</div>
                        <div className="mobile-user-email">{user?.email}</div>
                      </div>
                    </div>
                    
                    <div className="mobile-user-actions">
                      <Link to="/dashboard" className="mobile-menu-item">
                        <span className="menu-item-icon">📊</span>
                        Dashboard
                      </Link>
                      <Link to="/dashboard" className="mobile-menu-item">
                        <span className="menu-item-icon">⚙️</span>
                        Settings
                      </Link>
                      <button onClick={handleLogout} className="mobile-menu-item logout-item">
                        <span className="menu-item-icon">🚪</span>
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mobile-auth-buttons">
                    <Link to="/login" className="btn btn-secondary btn-lg w-full mb-3">
                      Login
                    </Link>
                    <Link to="/register" className="btn btn-primary btn-lg w-full">
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Navbar Styles */}
      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--gray-200);
          z-index: var(--z-dropdown);
          height: 80px;
          display: flex;
          align-items: center;
          transition: all var(--transition-fast);
        }

        .navbar-scrolled {
          background: rgba(255, 255, 255, 0.98);
          box-shadow: var(--shadow-sm);
        }

        .nav-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .logo {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: var(--space-2);
          transition: transform var(--transition-fast);
        }

        .logo:hover {
          transform: scale(1.02);
        }

        .logo-icon {
          font-size: var(--text-3xl);
        }

        .nav-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: var(--space-8);
        }

        .nav-link {
          font-weight: var(--font-weight-medium);
          color: var(--gray-600);
          transition: color var(--transition-fast);
          position: relative;
          padding: var(--space-2) 0;
        }

        .nav-link:hover {
          color: var(--gray-900);
        }

        .nav-link.active {
          color: var(--primary-600);
        }

        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--primary-600);
          border-radius: 1px;
        }

        .nav-auth {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .nav-loading {
          padding: var(--space-2);
        }

        .auth-buttons {
          display: flex;
          gap: var(--space-3);
          align-items: center;
        }

        .user-menu-container {
          position: relative;
        }

        .user-menu-trigger {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border: none;
          background: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .user-menu-trigger:hover {
          background-color: var(--gray-100);
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
          font-weight: var(--font-weight-semibold);
          font-size: var(--text-sm);
        }

        .user-name {
          font-weight: var(--font-weight-medium);
          color: var(--gray-700);
          font-size: var(--text-sm);
        }

        .chevron {
          transition: transform var(--transition-fast);
          color: var(--gray-400);
        }

        .chevron.rotated {
          transform: rotate(180deg);
        }

        .user-menu-dropdown {
          position: absolute;
          top: calc(100% + var(--space-2));
          right: 0;
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          min-width: 280px;
          padding: var(--space-4);
          z-index: var(--z-dropdown);
        }

        .user-menu-header {
          display: flex;
          gap: var(--space-3);
          margin-bottom: var(--space-3);
        }

        .user-menu-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
          font-weight: var(--font-weight-semibold);
          font-size: var(--text-lg);
          flex-shrink: 0;
        }

        .user-menu-info {
          flex: 1;
          min-width: 0;
        }

        .user-menu-name {
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .user-menu-email {
          font-size: var(--text-sm);
          color: var(--gray-500);
          word-break: break-word;
        }

        .user-menu-divider {
          height: 1px;
          background-color: var(--gray-200);
          margin: var(--space-3) 0;
        }

        .user-menu-items {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .user-menu-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          text-decoration: none;
          color: var(--gray-700);
          transition: background-color var(--transition-fast);
          border: none;
          background: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
        }

        .user-menu-item:hover {
          background-color: var(--gray-50);
          color: var(--gray-900);
        }

        .user-menu-item.logout-item:hover {
          background-color: var(--error-100);
          color: var(--error-500);
        }

        .menu-item-icon {
          font-size: var(--text-lg);
          width: 20px;
          text-align: center;
        }

        /* Mobile Menu */
        .mobile-menu-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: background-color var(--transition-fast);
        }

        .mobile-menu-button:hover {
          background-color: var(--gray-100);
        }

        .hamburger {
          width: 20px;
          height: 14px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .hamburger span {
          display: block;
          height: 2px;
          width: 100%;
          background-color: var(--gray-600);
          border-radius: 1px;
          transition: all var(--transition-fast);
        }

        .hamburger.active span:nth-child(1) {
          transform: rotate(45deg) translate(5px, 5px);
        }

        .hamburger.active span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.active span:nth-child(3) {
          transform: rotate(-45deg) translate(7px, -6px);
        }

        .mobile-menu {
          background: var(--white);
          border-top: 1px solid var(--gray-200);
          box-shadow: var(--shadow-lg);
        }

        .mobile-menu-content {
          padding: var(--space-4);
          max-height: calc(100vh - 80px);
          overflow-y: auto;
        }

        .mobile-nav-links {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          margin-bottom: var(--space-6);
        }

        .mobile-nav-link {
          padding: var(--space-4);
          border-radius: var(--radius-md);
          text-decoration: none;
          color: var(--gray-700);
          font-weight: var(--font-weight-medium);
          transition: background-color var(--transition-fast);
        }

        .mobile-nav-link:hover,
        .mobile-nav-link.active {
          background-color: var(--primary-100);
          color: var(--primary-600);
        }

        .mobile-auth {
          border-top: 1px solid var(--gray-200);
          padding-top: var(--space-6);
        }

        .mobile-loading {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          justify-content: center;
          padding: var(--space-4);
          color: var(--gray-500);
        }

        .mobile-user-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .mobile-user-info {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          background-color: var(--gray-50);
          border-radius: var(--radius-lg);
        }

        .mobile-user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
          font-weight: var(--font-weight-semibold);
          flex-shrink: 0;
        }

        .mobile-user-name {
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .mobile-user-email {
          font-size: var(--text-sm);
          color: var(--gray-500);
        }

        .mobile-user-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .mobile-menu-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          border-radius: var(--radius-md);
          text-decoration: none;
          color: var(--gray-700);
          transition: background-color var(--transition-fast);
          border: none;
          background: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          font-size: var(--text-base);
        }

        .mobile-menu-item:hover {
          background-color: var(--gray-50);
          color: var(--gray-900);
        }

        .mobile-menu-item.logout-item:hover {
          background-color: var(--error-100);
          color: var(--error-500);
        }

        .mobile-auth-buttons {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .w-full {
          width: 100%;
        }

        .mb-3 {
          margin-bottom: var(--space-3);
        }

        @media (max-width: 768px) {
          .navbar {
            height: 64px;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;