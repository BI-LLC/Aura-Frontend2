// UserCard.js - User Profile Card Component
// Displays user information and AI personality in the explore section

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { copyTextToClipboard } from '../../utils/clipboard';

const looksLikeEmail = (value) => /@/.test((value || '').toString());
const sanitizeName = (value) => {
  if (!value) {
    return '';
  }
  const trimmed = value.toString().trim();
  if (!trimmed || looksLikeEmail(trimmed)) {
    return '';
  }
  return trimmed;
};
const sanitizeUsername = (value) => {
  if (!value) {
    return '';
  }
  return value.toString().trim().replace(/^@+/, '');
};

const UserCard = ({ user, onChatClick, showActions = true, compact = false }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copyStatus, setCopyStatus] = useState('idle');

  // Default placeholder data if user prop is incomplete
  const sanitizedPrimaryName = sanitizeName(user?.name);

  const userData = {
    id: user?.id || '',
    slug: user?.slug || '',
    fullName:
      sanitizeName(user?.fullName) ||
      sanitizeName(user?.full_name) ||
      sanitizeName(user?.name) ||
      sanitizeName(user?.displayName) ||
      '',
    username:
      sanitizeUsername(user?.username) ||
      sanitizeUsername(user?.handle) ||
      sanitizeUsername(user?.slug) ||
      '',
    name: sanitizeName(user?.name) || 'Anonymous User',
    tagline: user?.tagline || 'AI Assistant',
    description: user?.description || 'A helpful AI assistant ready to chat with you.',
    avatarUrl: user?.avatarUrl || user?.avatar_url || null,
    avatar: user?.avatar || user?.avatarInitials || (user?.name ? user.name.charAt(0) : 'A'),
    isOnline: user?.isOnline ?? true,
    responseTime: user?.responseTime || 'Usually responds in seconds',
    totalChats: user?.totalChats || 0,
    rating: user?.rating || 4.5,
    categories: user?.categories || user?.tags || [],
    personality: user?.personality || 'friendly',
    voiceEnabled: user?.voiceEnabled ?? true,
    lastActive: user?.lastActive ? new Date(user?.lastActive) : new Date(),
    isVerified: user?.isVerified ?? false,
    title:
      user?.title ||
      user?.headline ||
      user?.tagline ||
      (sanitizedPrimaryName ? `${sanitizedPrimaryName}'s AI Assistant` : ''),
    ...user
  };

  if (!userData.name || userData.name === 'Anonymous User') {
    const fallbackName = userData.fullName || (userData.username ? userData.username.replace(/[_-]/g, ' ') : 'Aura Assistant');
    userData.name = fallbackName;
  }
  if (!userData.avatar || userData.avatar === 'A') {
    const avatarSource = userData.fullName || userData.name || userData.username;
    if (avatarSource) {
      userData.avatar = avatarSource.toString().charAt(0).toUpperCase();
    }
  }

  if (!userData.title) {
    userData.title = `${userData.name || 'Aura Assistant'}'s AI Assistant`;
  }

  const shareUrl = useMemo(() => {
    const slug = userData.slug || userData.username;
    if (!slug) {
      return '';
    }
    return `https://www.iaura.ai/chat/${slug}`;
  }, [userData.slug, userData.username]);

  /**
   * Handle starting a chat with this user
   */
  const handleChatClick = (e) => {
    e.stopPropagation();
    const targetSlug = userData.slug || userData.username;
    if (!targetSlug) {
      return;
    }
    if (onChatClick) {
      onChatClick(userData);
    } else {
      navigate(`/chat/${targetSlug}`);
    }
  };

  /**
   * Handle starting a voice call session
   */
  const handleStartCall = (e) => {
    e.stopPropagation();

    const targetSlug = userData.slug || userData.username || userData.id;
    if (!targetSlug) {
      return;
    }

    const callProfile = {
      ...userData,
      slug: targetSlug,
      title:
        userData.title ||
        userData.tagline ||
        (userData.name ? `${userData.name}'s AI Assistant` : 'Aura Assistant')
    };

    navigate(`/chat/${targetSlug}/call`, {
      state: {
        profile: callProfile
      }
    });
  };

  /**
   * Handle viewing user profile
   */
  const handleViewProfile = () => {
    const targetSlug = userData.slug || userData.username;
    if (targetSlug) {
      navigate(`/profile/${targetSlug}`);
    }
  };

  /**
   * Format personality label for display
   */
  const getPersonalityLabel = (personality) => {
    if (!personality) return 'Personality';
    return personality.charAt(0).toUpperCase() + personality.slice(1);
  };

  useEffect(() => {
    setImageError(false);
  }, [userData.avatarUrl, userData.id]);

  useEffect(() => {
    if (copyStatus === 'idle') {
      return undefined;
    }

    const timeout = setTimeout(() => setCopyStatus('idle'), 2500);
    return () => clearTimeout(timeout);
  }, [copyStatus]);

  /**
   * Get status indicator color
   */
  const getStatusColor = () => {
    if (userData.isOnline) return '#10b981'; // green
    const timeSinceActive = new Date() - userData.lastActive;
    const hoursAgo = timeSinceActive / (1000 * 60 * 60);
    
    if (hoursAgo < 1) return '#f59e0b'; // yellow
    return '#6b7280'; // gray
  };

  /**
   * Format time since last active
   */
  const formatLastActive = () => {
    if (userData.isOnline) return 'Online now';
    
    const now = new Date();
    const diff = now - userData.lastActive;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  /**
   * Render star rating
   */
  const renderRating = () => {
    const fullStars = Math.floor(userData.rating);
    const hasHalfStar = userData.rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="rating">
        {'★'.repeat(fullStars)}
        {hasHalfStar && '☆'}
        {'☆'.repeat(emptyStars)}
        <span className="rating-number">({userData.rating})</span>
      </div>
    );
  };

  const handleShareProfile = async (event) => {
    event.stopPropagation();

    if (!shareUrl) {
      setCopyStatus('error');
      return;
    }

    const success = await copyTextToClipboard(shareUrl);
    setCopyStatus(success ? 'copied' : 'error');
  };

  // Compact card for smaller spaces
  if (compact) {
    return (
      <div className="user-card compact" onClick={handleViewProfile}>
        <div className="card-avatar">
          {!imageError && userData.avatarUrl ? (
            <img
              src={userData.avatarUrl}
              alt={userData.name}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="avatar-placeholder">
              {userData.avatar?.toString().substring(0, 2).toUpperCase()}
            </div>
          )}
          <div 
            className="status-indicator"
            style={{ backgroundColor: getStatusColor() }}
          ></div>
        </div>
        
        <div className="card-info">
          <h4>{userData.fullName || userData.name}</h4>
          {userData.username && <span className="compact-username">@{userData.username}</span>}
          <p>{userData.tagline}</p>
          <span className="last-active">{formatLastActive()}</span>
        </div>

        <div className="card-actions">
          <button
            className="chat-btn primary"
            onClick={handleChatClick}
            title="Start chat"
          >
            Chat
          </button>
          {userData.voiceEnabled && (
            <button
              className="chat-btn secondary"
              onClick={handleStartCall}
              title="Start voice call"
            >
              Call
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <div 
      className={`user-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header */}
      <div className="card-header">
        <div className="avatar-section">
          {!imageError && userData.avatarUrl ? (
            <img
              src={userData.avatarUrl}
              alt={userData.fullName || userData.name}
              className="user-avatar"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="avatar-placeholder">
              {userData.avatar?.toString().substring(0, 2).toUpperCase()}
            </div>
          )}
          
          {/* Status indicator */}
          <div 
            className="status-indicator"
            style={{ backgroundColor: getStatusColor() }}
            title={userData.isOnline ? 'Online' : formatLastActive()}
          ></div>

          {/* Verified badge */}
          {userData.isVerified && (
            <div className="verified-badge" title="Verified AI">
              ✓
            </div>
          )}
        </div>

        <div className="user-info">
          <div className="name-section">
            <div className="name-stack">
              <h3>{userData.fullName || userData.name}</h3>
              {userData.username && <span className="user-username">@{userData.username}</span>}
            </div>
            <span className="personality-indicator">
              {getPersonalityLabel(userData.personality)}
            </span>
          </div>
          
          <p className="tagline">{userData.tagline}</p>
          
          <div className="status-info">
            <span className="online-status">{formatLastActive()}</span>
            {userData.voiceEnabled && (
              <span className="voice-enabled" title="Voice chat available">
                Voice
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body">
        <p className="description">{userData.description}</p>

        {/* Categories/Tags */}
        {userData.categories && userData.categories.length > 0 && (
          <div className="categories">
            {userData.categories.slice(0, 3).map((category, index) => (
              <span key={index} className="category-tag">
                {category}
              </span>
            ))}
            {userData.categories.length > 3 && (
              <span className="category-more">
                +{userData.categories.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="user-stats">
          <div className="stat">
            <span className="stat-value">{userData.totalChats}</span>
            <span className="stat-label">Chats</span>
          </div>
          
          <div className="stat">
            <span className="stat-value">{userData.responseTime}</span>
            <span className="stat-label">Response Time</span>
          </div>

          <div className="stat rating-stat">
            {renderRating()}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      {showActions && (
        <div className="card-footer">
          <button
            type="button"
            className={`btn secondary share-btn ${copyStatus === 'copied' ? 'copied' : ''}`}
            onClick={handleShareProfile}
            disabled={!shareUrl}
          >
            {copyStatus === 'copied'
              ? 'Link Copied!'
              : copyStatus === 'error'
              ? 'Copy Failed'
              : 'Share Assistant'}
          </button>
          <button
            className="btn secondary"
            onClick={handleViewProfile}
          >
            View Profile
          </button>
          
          <button
            className="btn primary"
            onClick={handleChatClick}
          >
            Start Chat
          </button>
          {userData.voiceEnabled && (
            <button
              className="btn secondary"
              onClick={handleStartCall}
            >
              Start Call
            </button>
          )}
        </div>
      )}

      {/* Hover overlay for additional info */}
      {isHovered && (
        <div className="hover-overlay">
          <div className="quick-stats">
            <div className="quick-stat">
              <strong>Personality:</strong> {userData.personality}
            </div>
            <div className="quick-stat">
              <strong>Specialties:</strong> {userData.categories?.join(', ') || 'General'}
            </div>
            <div className="quick-stat">
              <strong>Voice Chat:</strong> {userData.voiceEnabled ? 'Available' : 'Text only'}
            </div>
          </div>
        </div>
      )}

      {/* Loading state overlay */}
      {userData.isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading AI...</p>
        </div>
      )}
    </div>
  );
};

// PropTypes for better development experience
UserCard.defaultProps = {
  user: {},
  showActions: true,
  compact: false,
  onChatClick: null
};

export default UserCard;