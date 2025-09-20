// DashboardOverview.js - Dashboard Statistics Overview Component
// Shows user stats, AI performance metrics, and recent activity

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAPI } from '../../hooks/useAPI';
import LoadingSpinner from '../common/LoadingSpinner';

const DashboardOverview = () => {
  const { user } = useAuth();
  const { apiCall, loading } = useAPI();
  
  // State for dashboard data
  const [stats, setStats] = useState({
    totalChats: 0,
    voiceMinutes: 0,
    trainingProgress: 0,
    responseAccuracy: 0,
    lastActive: null,
    weeklyGrowth: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  /**
   * Fetch all dashboard statistics from API
   */
  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      // Fetch user statistics
      const statsResponse = await apiCall(`/users/${user.slug}/stats`);
      if (statsResponse) {
        setStats({
          totalChats: statsResponse.total_conversations || 0,
          voiceMinutes: Math.round(statsResponse.voice_minutes || 0),
          trainingProgress: statsResponse.training_progress || 0,
          responseAccuracy: statsResponse.accuracy_score || 0,
          lastActive: statsResponse.last_active ? new Date(statsResponse.last_active) : null,
          weeklyGrowth: statsResponse.weekly_growth || 0
        });
      }

      // Fetch recent activity
      const activityResponse = await apiCall(`/users/${user.slug}/activity?limit=5`);
      if (activityResponse && activityResponse.activities) {
        setRecentActivity(activityResponse.activities);
      }

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    }
  };

  /**
   * Format large numbers with K/M suffixes
   */
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  /**
   * Format time relative to now (e.g., "2 hours ago")
   */
  const formatTimeAgo = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (loading && !stats.totalChats) {
    return (
      <div className="dashboard-overview">
        <LoadingSpinner />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard-overview">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-overview">
      {/* Header */}
      <div className="overview-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome back, {user?.name || 'User'}! Here's how your AI is performing.</p>
      </div>

      {/* Main Stats Grid */}
      <div className="stats-grid">
        {/* Total Conversations */}
        <div className="stat-card primary">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <h3>{formatNumber(stats.totalChats)}</h3>
            <p>Total Conversations</p>
            <span className="stat-change positive">
              +{stats.weeklyGrowth}% this week
            </span>
          </div>
        </div>

        {/* Voice Minutes */}
        <div className="stat-card secondary">
          <div className="stat-icon">🎤</div>
          <div className="stat-content">
            <h3>{formatNumber(stats.voiceMinutes)}</h3>
            <p>Voice Minutes</p>
            <span className="stat-change neutral">
              Last active {formatTimeAgo(stats.lastActive)}
            </span>
          </div>
        </div>

        {/* Training Progress */}
        <div className="stat-card accent">
          <div className="stat-icon">🧠</div>
          <div className="stat-content">
            <h3>{stats.trainingProgress}%</h3>
            <p>Training Complete</p>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${stats.trainingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Response Accuracy */}
        <div className="stat-card success">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{stats.responseAccuracy}%</h3>
            <p>Response Accuracy</p>
            <span className="stat-change positive">
              {stats.responseAccuracy > 80 ? 'Excellent!' : 'Good'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="recent-activity">
        <div className="section-header">
          <h3>Recent Activity</h3>
          <button className="view-all-btn">View All</button>
        </div>

        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'chat' && '💬'}
                  {activity.type === 'training' && '🧠'}
                  {activity.type === 'voice' && '🎤'}
                  {activity.type === 'widget' && '🔧'}
                </div>
                <div className="activity-content">
                  <p className="activity-text">{activity.description}</p>
                  <span className="activity-time">
                    {formatTimeAgo(new Date(activity.timestamp))}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-activity">
              <p>No recent activity found.</p>
              <p>Start chatting with your AI to see activity here!</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn primary">
            <span>🎤</span>
            Start Voice Chat
          </button>
          <button className="action-btn secondary">
            <span>🧠</span>
            Continue Training
          </button>
          <button className="action-btn accent">
            <span>🔧</span>
            Generate Widget
          </button>
          <button className="action-btn neutral">
            <span>📊</span>
            View Analytics
          </button>
        </div>
      </div>

      {/* Tips Section */}
      <div className="tips-section">
        <h3>💡 Tips to Improve Your AI</h3>
        <div className="tips-list">
          {stats.trainingProgress < 50 && (
            <div className="tip-item">
              <p>Upload more training data to improve response quality</p>
            </div>
          )}
          {stats.responseAccuracy < 80 && (
            <div className="tip-item">
              <p>Review and correct responses to boost accuracy</p>
            </div>
          )}
          {stats.totalChats < 10 && (
            <div className="tip-item">
              <p>Have more conversations to help your AI learn your style</p>
            </div>
          )}
          <div className="tip-item">
            <p>Regular voice chats help improve natural conversation flow</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;