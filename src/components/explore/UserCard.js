// UserCard.js - User Profile Card Component
// Displays user information and AI personality in the explore section

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserCard = ({ user, onChatClick, showActions = true, compact = false }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Default placeholder data if user prop is incomplete
  const userData = {
    id: user?.id || '',
    slug: user?.slug || '',
    name: user?.name || 'Anonymous User',
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
    ...user
  };

  /**
   * Handle starting a chat with this user
   */
  const handleChatClick = (e) => {
    e.stopPropagation();
    if (onChatClick) {
      onChatClick(userData);
    } else {
      navigate(`/chat/${userData.slug}`);
    }
  };

  /**
   * Handle viewing user profile
   */
  const handleViewProfile = () => {
    navigate(`/profile/${userData.slug}`);
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
          <h4>{userData.name}</h4>
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
              alt={userData.name}
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
            <h3>{userData.name}</h3>
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