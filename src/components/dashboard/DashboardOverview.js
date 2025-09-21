import React, { useEffect, useMemo, useState } from 'react';
import {
  getUserDisplayName,
  getUserFullName,
  getUserProfileUrl,
  getUserUsername
} from '../../utils/userDisplay';
import { copyTextToClipboard } from '../../utils/clipboard';

const DashboardOverview = ({ user, dashboardData, onRefresh }) => {
  const {
    totalConversations = 0,
    totalDocuments = 0,
    totalQAPairs = 0,
    totalLogicNotes = 0,
    uniqueTagCount = 0,
    recentActivity = []
  } = dashboardData || {};

  const [copyStatus, setCopyStatus] = useState('idle');

  const fullName = getUserFullName(user);
  const displayName = getUserDisplayName(user);
  const username = getUserUsername(user);
  const profileUrl = useMemo(() => getUserProfileUrl(user), [user]);

  useEffect(() => {
    if (copyStatus === 'idle') {
      return undefined;
    }

    const timeout = setTimeout(() => setCopyStatus('idle'), 2500);
    return () => clearTimeout(timeout);
  }, [copyStatus]);

  const handleCopyProfileLink = async () => {
    if (!profileUrl) {
      setCopyStatus('error');
      return;
    }

    const success = await copyTextToClipboard(profileUrl);
    setCopyStatus(success ? 'copied' : 'error');
  };

  const trainingItems = totalQAPairs + totalLogicNotes;
  const knowledgeSources = totalDocuments;
  const totalKnowledgeUnits = trainingItems + knowledgeSources;

  const trainingCoverage = useMemo(() => {
    if (totalKnowledgeUnits === 0) return 0;
    return Math.min(100, Math.round((trainingItems / totalKnowledgeUnits) * 100));
  }, [trainingItems, totalKnowledgeUnits]);

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '—';
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const diff = Date.now() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return '—';
    }
  };

  const formatNumber = (value) => {
    if (value > 999999) return `${(value / 1000000).toFixed(1)}M`;
    if (value > 999) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const overviewCards = [
    {
      label: 'Conversations',
      value: formatNumber(totalConversations),
      helper: 'Sessions captured in Supabase'
    },
    {
      label: 'Reference Files',
      value: formatNumber(totalDocuments),
      helper: 'Documents available for retrieval'
    },
    {
      label: 'Manual Q&A',
      value: formatNumber(totalQAPairs),
      helper: 'Prompt / response pairs'
    },
    {
      label: 'Logic Notes',
      value: formatNumber(totalLogicNotes),
      helper: 'Behavioral rules & guidance'
    }
  ];

  const secondaryStats = [
    {
      title: 'Knowledge Sources',
      value: formatNumber(totalKnowledgeUnits),
      description: 'Combined documents, logic notes, and Q&A items.'
    },
    {
      title: 'Training Coverage',
      value: `${trainingCoverage}%`,
      description: 'Share of knowledge coming from curated Q&A and logic.'
    },
    {
      title: 'Unique Tags',
      value: formatNumber(uniqueTagCount),
      description: 'Topics used for filtering and retrieval.'
    }
  ];

  return (
    <div className="dashboard-overview">
      <div className="overview-header">
        <div>
          <h2>Dashboard Overview</h2>
          <p>
            Welcome back, {fullName || displayName || 'User'}! Track your training footprint and recent activity at a glance.
          </p>
        </div>
        <div className="overview-actions">
          <div className="share-profile">
            <div className="share-text">
              <span className="share-label">Share your AI Voice</span>
              <span className="share-value">
                {profileUrl || 'Complete your profile to unlock sharing'}
              </span>
              {username && (
                <span className="share-username">@{username}</span>
              )}
            </div>
            <button
              type="button"
              className={`share-button ${copyStatus}`}
              onClick={handleCopyProfileLink}
              disabled={!profileUrl}
            >
              {copyStatus === 'copied'
                ? 'Link Copied!'
                : copyStatus === 'error'
                ? 'Copy Failed'
                : 'Copy AI Voice Link'}
            </button>
          </div>
          {onRefresh && (
            <button className="refresh-btn" onClick={onRefresh}>
              Refresh data
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        {overviewCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
            <div className="stat-helper">{card.helper}</div>
          </div>
        ))}
      </div>

      <div className="insights-grid">
        {secondaryStats.map((item) => (
          <div key={item.title} className="insight-card">
            <h3>{item.title}</h3>
            <p className="insight-value">{item.value}</p>
            <p className="insight-description">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="activity-card">
        <div className="activity-header">
          <h3>Recent Activity</h3>
          <span>{recentActivity.length > 0 ? `${recentActivity.length} latest entries` : 'No activity logged yet'}</span>
        </div>
        {recentActivity.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">No Data</span>
            <p>No recent conversations recorded.</p>
            <p className="empty-helper">Start a new session or add training content to see it here.</p>
          </div>
        ) : (
          <div className="activity-list">
            {recentActivity.map((entry) => (
              <div key={entry.session_id || entry.timestamp} className="activity-item">
                <div className="activity-content">
                  <p className="activity-summary">{entry.summary || 'Conversation summary not available.'}</p>
                  <span className="activity-meta">
                    Session {entry.session_id || '—'} · {formatRelativeTime(entry.timestamp || entry.created_at)}
                  </span>
                </div>
                <div className="activity-date">
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-overview {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .overview-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-6);
          flex-wrap: wrap;
        }

        .overview-header h2 {
          font-size: var(--text-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .overview-header p {
          color: var(--gray-600);
          max-width: 640px;
        }

        .overview-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: var(--space-3);
          flex: 1;
          min-width: 260px;
        }

        .share-profile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
          background: var(--gray-100);
          border-radius: var(--radius-lg);
          padding: var(--space-3) var(--space-4);
          width: 100%;
        }

        .share-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .share-label {
          font-size: var(--text-xs);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--gray-500);
        }

        .share-value {
          font-family: 'Menlo', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
          font-size: var(--text-sm);
          color: var(--gray-800);
          word-break: break-all;
        }

        .share-username {
          font-size: var(--text-xs);
          color: var(--primary-600);
        }

        .share-button {
          border: none;
          background: var(--primary-600);
          color: var(--white);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .share-button:hover:not(:disabled) {
          background: var(--primary-500);
        }

        .share-button:disabled {
          background: var(--gray-300);
          color: var(--gray-600);
          cursor: not-allowed;
        }

        .share-button.copied {
          background: var(--green-500, #10b981);
        }

        .share-button.error {
          background: var(--red-500, #ef4444);
        }

        .refresh-btn {
          border: none;
          background: var(--gray-200);
          color: var(--gray-700);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: var(--font-weight-medium);
        }

        .refresh-btn:hover {
          background: var(--gray-300);
        }

        @media (max-width: 768px) {
          .overview-actions {
            align-items: stretch;
            min-width: 100%;
          }

          .share-profile {
            flex-direction: column;
            align-items: stretch;
          }

          .share-button {
            width: 100%;
            text-align: center;
          }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-5);
          border-radius: var(--radius-xl);
          border: 1px solid var(--gray-200);
          background: var(--white);
          box-shadow: var(--shadow-sm);
        }

        .stat-value {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
        }

        .stat-label {
          color: var(--gray-600);
          font-weight: var(--font-weight-medium);
        }

        .stat-helper {
          color: var(--gray-500);
          font-size: var(--text-sm);
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-4);
        }

        .insight-card {
          background: var(--gray-50);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
        }

        .insight-card h3 {
          font-size: var(--text-lg);
          color: var(--gray-800);
          margin-bottom: var(--space-2);
        }

        .insight-value {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-semibold);
          color: var(--primary-600);
        }

        .insight-description {
          color: var(--gray-600);
          margin-top: var(--space-2);
          line-height: 1.6;
        }

        .activity-card {
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .activity-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: var(--space-4);
        }

        .activity-header h3 {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
        }

        .activity-header span {
          color: var(--gray-500);
          font-size: var(--text-sm);
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .activity-item {
          display: flex;
          justify-content: space-between;
          gap: var(--space-4);
          padding: var(--space-4);
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-100);
          background: var(--gray-50);
        }

        .activity-summary {
          color: var(--gray-800);
          font-weight: var(--font-weight-medium);
        }

        .activity-meta {
          color: var(--gray-500);
          font-size: var(--text-sm);
        }

        .activity-date {
          color: var(--gray-500);
          font-size: var(--text-sm);
          min-width: 160px;
          text-align: right;
        }

        .empty-state {
          text-align: center;
          padding: var(--space-10) var(--space-4);
          color: var(--gray-600);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
        }

        .empty-icon {
          font-size: 3rem;
        }

        .empty-helper {
          color: var(--gray-500);
          font-size: var(--text-sm);
        }

        @media (max-width: 768px) {
          .overview-header {
            flex-direction: column;
          }

          .activity-item {
            flex-direction: column;
          }

          .activity-date {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardOverview;
