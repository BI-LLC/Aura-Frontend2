// Aura Voice AI - Main Dashboard Component (Refactored)
// =========================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

// Import separate tab components
import DashboardOverview from './DashboardOverview';
import TrainingDashboard from './TrainingDashboard';
import WidgetGenerator from './WidgetGenerator';
import SettingsTab from './SettingsTab';
import { getUserFullName } from '../../utils/userDisplay';

/**
 * Main Dashboard Component
 * 
 * Clean main dashboard that delegates to separate components
 * Each major feature now has its own dedicated file
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, supabase, signOut } = useAuth();
  const userId = user?.id || user?.user_id || null;
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard data state - shared across components
  const [dashboardData, setDashboardData] = useState({
    totalConversations: 0,
    totalDocuments: 0,
    totalQAPairs: 0,
    totalLogicNotes: 0,
    uniqueTagCount: 0,
    recentActivity: []
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      if (!supabase || !userId) {
        setLoading(false);
        return;
      }

      // Fetch conversation stats
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversation_summaries')
        .select('session_id')
        .eq('user_id', userId);

      if (conversationsError) throw conversationsError;

      // Fetch documents
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('doc_id')
        .eq('user_id', userId);

      if (documentsError) throw documentsError;

      // Fetch recent activity from conversation summaries
      const { data: activity, error: activityError } = await supabase
        .from('conversation_summaries')
        .select('session_id, summary, key_topics, timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (activityError) throw activityError;

      setDashboardData({
        totalConversations: conversations?.length || 0,
        totalDocuments: documents?.length || 0,
        totalQAPairs: 0, // Will be updated by TrainingDashboard
        totalLogicNotes: 0, // Will be updated by TrainingDashboard
        recentActivity: (activity || []).map(item => ({
          ...item,
          timestamp: item.timestamp || null
        }))
      });
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Update dashboard data from child components
  const updateDashboardData = useCallback((updates) => {
    setDashboardData(prev => ({ ...prev, ...updates }));
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', component: DashboardOverview },
    { id: 'training', label: 'Training Content', component: TrainingDashboard },
    { id: 'analytics', label: 'Analytics', component: AnalyticsTab },
    { id: 'widget', label: 'Widget Code', component: WidgetGenerator },
    { id: 'settings', label: 'Settings', component: SettingsTab }
  ];

  const handleSignOut = async () => {
    const result = await signOut();
    if (result?.success) {
      navigate('/login');
    } else if (result?.error) {
      console.error('Sign out failed:', result.error);
    }
  };

  const getCurrentTabComponent = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    const Component = currentTab?.component;
    
    if (!Component) return null;

    // Pass shared props to all components
    const sharedProps = {
      user,
      supabase,
      dashboardData,
      updateDashboardData,
      onRefresh: fetchDashboardData
    };

    return <Component {...sharedProps} />;
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="container">
          <div className="loading-container">
            <LoadingSpinner size="large" message="Loading dashboard..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="container">
          <div className="error-container">
            <div className="error-message">
              <h3>Dashboard Error</h3>
              <p>{error}</p>
              <button onClick={fetchDashboardData} className="btn btn-primary">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <div>
              <h1 className="dashboard-title">
                Welcome back, {getUserFullName(user) || user?.email || 'User'}!
              </h1>
              <p className="dashboard-subtitle">
                Manage your AI assistant, review performance, and optimize your voice experience.
              </p>
            </div>
            <button className="signout-btn" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="dashboard-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {getCurrentTabComponent()}
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .dashboard-page {
          padding: var(--space-6) 0 var(--space-20);
          min-height: calc(100vh - 80px);
          background: var(--gray-50);
        }

        .dashboard-header {
          margin-bottom: var(--space-8);
        }

        .header-content {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-4);
          flex-wrap: wrap;
        }

        .dashboard-title {
          font-size: var(--text-4xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-2);
        }

        .dashboard-subtitle {
          font-size: var(--text-lg);
          color: var(--gray-600);
          max-width: 600px;
        }

        .dashboard-tabs {
          display: flex;
          gap: var(--space-2);
          margin-bottom: var(--space-8);
          border-bottom: 1px solid var(--gray-200);
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .dashboard-tabs::-webkit-scrollbar {
          display: none;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border: none;
          background: none;
          color: var(--gray-600);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          transition: all var(--transition-fast);
          position: relative;
          white-space: nowrap;
          min-width: fit-content;
        }

        .signout-btn {
          align-self: flex-start;
          border: 1px solid var(--gray-300);
          background: var(--white);
          color: var(--gray-700);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
        }

        .signout-btn:hover {
          background: var(--gray-100);
        }

        .tab-button:hover {
          color: var(--gray-900);
          background: var(--gray-100);
        }

        .tab-button.active {
          color: var(--primary-600);
          background: var(--white);
          border-bottom: 2px solid var(--primary-600);
        }

        .tab-content {
          background: var(--white);
          border-radius: var(--radius-2xl);
          padding: var(--space-8);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
          min-height: 600px;
        }

        .loading-container,
        .error-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .error-message {
          text-align: center;
          padding: var(--space-8);
          background: var(--white);
          border-radius: var(--radius-xl);
          border: 1px solid var(--error-200);
        }

        .error-message h3 {
          color: var(--error-600);
          margin-bottom: var(--space-2);
        }

        .error-message p {
          color: var(--gray-600);
          margin-bottom: var(--space-4);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .dashboard-tabs {
            flex-wrap: wrap;
            gap: var(--space-1);
          }

          .tab-button {
            flex: 1;
            min-width: 120px;
            justify-content: center;
          }

          .tab-content {
            padding: var(--space-4);
          }

          .dashboard-title {
            font-size: var(--text-2xl);
          }

          .dashboard-subtitle {
            font-size: var(--text-base);
          }
        }

        @media (max-width: 480px) {
          .dashboard-tabs {
            flex-direction: column;
          }

          .tab-button {
            justify-content: flex-start;
            border-radius: var(--radius-md);
            margin-bottom: var(--space-1);
          }

          .tab-button.active {
            border-bottom: none;
            border-left: 3px solid var(--primary-600);
          }
        }
      `}</style>
    </div>
  );
};

// Placeholder components for tabs that don't have separate files yet
const AnalyticsTab = ({ dashboardData }) => (
  <div className="placeholder-tab">
    <h2 className="placeholder-title">Analytics Dashboard</h2>
    <p className="placeholder-description">
      Detailed analytics and performance metrics coming soon...
    </p>
    <div className="placeholder-content">
      <div className="placeholder-card">
        <h3>Conversation Insights</h3>
        <p>Track conversation patterns, user engagement, and response effectiveness.</p>
      </div>
      <div className="placeholder-card">
        <h3>Performance Metrics</h3>
        <p>Monitor response time, accuracy scores, and user satisfaction ratings.</p>
      </div>
      <div className="placeholder-card">
        <h3>Usage Analytics</h3>
        <p>Analyze usage trends, peak hours, and feature adoption.</p>
      </div>
    </div>
    
    <style jsx>{`
      .placeholder-tab {
        text-align: center;
        padding: var(--space-8);
      }

      .placeholder-title {
        font-size: var(--text-3xl);
        font-weight: var(--font-weight-bold);
        color: var(--gray-900);
        margin-bottom: var(--space-2);
      }

      .placeholder-description {
        font-size: var(--text-lg);
        color: var(--gray-600);
        margin-bottom: var(--space-8);
      }

      .placeholder-content {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-6);
        margin-top: var(--space-8);
      }

      .placeholder-card {
        background: var(--gray-50);
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-xl);
        padding: var(--space-6);
        text-align: left;
      }

      .placeholder-card h3 {
        font-size: var(--text-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--gray-900);
        margin-bottom: var(--space-2);
      }

      .placeholder-card p {
        color: var(--gray-600);
        line-height: 1.6;
      }
    `}</style>
  </div>
);

export default Dashboard;