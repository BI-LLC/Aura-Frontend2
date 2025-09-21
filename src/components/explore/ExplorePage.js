// Aura Voice AI - Explore Page Component
// ====================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { buildProfileSlug, isPermissionError } from '../../utils/slugUtils';

/**
 * ExplorePage Component
 * 
 * Professional browsing experience for voice chatbots
 * Designed for Silicon Valley executives to discover AI personalities
 */
const PROFILE_BUCKET = process.env.REACT_APP_SUPABASE_AVATAR_BUCKET || 'avatars';

const ExplorePage = () => {
  // ✅ FIXED: Get both isAuthenticated and supabase at top level
  const { isAuthenticated, supabase } = useAuth();
  
  // State management
  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');

  // Categories for filtering
  const categories = [
    { id: 'all', label: 'All Chatbots', count: 0 },
    { id: 'business', label: 'Business & Finance', count: 0 },
    { id: 'tech', label: 'Technology', count: 0 },
    { id: 'customer-service', label: 'Customer Service', count: 0 },
    { id: 'education', label: 'Education', count: 0 },
    { id: 'healthcare', label: 'Healthcare', count: 0 }
  ];

  // Sort options
  const sortOptions = [
    { id: 'popular', label: 'Most Popular' },
    { id: 'recent', label: 'Recently Added' },
    { id: 'rating', label: 'Highest Rated' },
    { id: 'name', label: 'Name A-Z' }
  ];

  const getPublicAvatarUrl = useCallback((path) => {
    if (!path || !supabase) {
      return null;
    }

    const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  }, [supabase]);

  const fetchProfilesDirectory = useCallback(async () => {
    if (!supabase) {
      setChatbots([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, bio, title, avatar_path, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      const mappedProfiles = (data || []).map((profile) => {
        const displayName = (profile.full_name || profile.username || 'Aura Assistant')
          .toString()
          .trim();

        const slug = buildProfileSlug({
          profile,
          fallbackName: displayName,
          fallbackId: profile.id
        });

        const avatarUrl = profile.avatar_url ||
          (profile.avatar_path ? getPublicAvatarUrl(profile.avatar_path) : null);

        return {
          id: profile.id,
          name: displayName,
          slug,
          title: profile.title || `${displayName.split(' ')[0] || displayName}'s AI Assistant`,
          category: 'business',
          description: profile.bio || 'Professional AI assistant ready to help you.',
          bio: profile.bio || '',
          avatar: displayName.charAt(0).toUpperCase(),
          avatarUrl,
          rating: 4.7,
          totalChats: 0,
          averageMessages: 0,
          tags: [],
          categories: [],
          isVerified: false,
          lastActive: profile.created_at,
          responseTime: '—',
          responseTimeSeconds: 0,
          email: profile.email || null,
          tenantId: null,
          confidence: 0.8,
          sessionsCount: 0,
          persona: null,
          preferences: null
        };
      });

      setChatbots(mappedProfiles);
      setError(null);
    } catch (directoryError) {
      if (isPermissionError(directoryError)) {
        setError('Public access to AI assistants is disabled. Please sign in to continue.');
      } else {
        setError('Failed to load chatbots. Please try again.');
      }
      console.error('Error loading public profiles:', directoryError);
      setChatbots([]);
    }
  }, [getPublicAvatarUrl, supabase]);

  const fetchChatbots = useCallback(async () => {
    try {
      setLoading(true);

      if (!supabase) {
        setChatbots([]);
        setLoading(false);
        return;
      }

      const { data: tenantUsers, error: usersError } = await supabase
        .from('tenant_users')
        .select('user_id, tenant_id, email, name, role, persona_settings, voice_preference, created_at');

      if (usersError) {
        if (isPermissionError(usersError)) {
          await fetchProfilesDirectory();
          return;
        }
        throw usersError;
      }

      if (!tenantUsers || tenantUsers.length === 0) {
        setChatbots([]);
        setError(null);
        return;
      }

      const userIds = tenantUsers
        .map(user => user.user_id)
        .filter(Boolean);

      let personas = [];
      let preferences = [];
      let stats = [];
      let profiles = [];

      if (userIds.length > 0) {
        const [
          { data: personaData, error: personaError },
          { data: preferenceData, error: preferenceError },
          { data: statsData, error: statsError },
          { data: profileData, error: profileError }
        ] = await Promise.all([
          supabase
            .from('user_personas')
            .select('user_id, tenant_id, formality, detail_level, example_style, questioning, energy, confidence, sessions_count, last_updated')
            .in('user_id', userIds),
          supabase
            .from('user_preferences')
            .select('user_id, communication_style, response_pace, expertise_areas, preferred_examples')
            .in('user_id', userIds),
          supabase
            .from('conversation_summaries')
            .select('user_id, session_id, message_count, timestamp')
            .in('user_id', userIds),
          supabase
            .from('profiles')
            .select('id, username, full_name, email, bio, title, avatar_path, created_at')
            .in('id', userIds)
        ]);

        if (personaError) {
          if (!isPermissionError(personaError)) {
            throw personaError;
          }
        } else {
          personas = personaData || [];
        }

        if (preferenceError) {
          if (!isPermissionError(preferenceError)) {
            throw preferenceError;
          }
        } else {
          preferences = preferenceData || [];
        }

        if (statsError) {
          if (!isPermissionError(statsError)) {
            console.warn('Failed to fetch conversation stats:', statsError);
          }
        } else {
          stats = statsData || [];
        }

        if (profileError) {
          if (!isPermissionError(profileError)) {
            throw profileError;
          }
        } else {
          profiles = profileData || [];
        }
      }

      const personaMap = new Map(personas.map(item => [item.user_id, item]));
      const preferencesMap = new Map(preferences.map(item => [item.user_id, item]));
      const profileMap = new Map(profiles.map(item => [item.id, item]));

      const statsMap = stats.reduce((acc, item) => {
        if (!acc.has(item.user_id)) {
          acc.set(item.user_id, []);
        }
        acc.get(item.user_id).push(item);
        return acc;
      }, new Map());

      const processedChatbots = tenantUsers.map(user => {
        const personaSettings = user.persona_settings || {};
        const persona = personaMap.get(user.user_id) || null;
        const preference = preferencesMap.get(user.user_id) || null;
        const profile = profileMap.get(user.user_id) || null;
        const userStats = statsMap.get(user.user_id) || [];

        const displayName = (
          personaSettings.display_name ||
          personaSettings.name ||
          profile?.full_name ||
          user.name ||
          user.email?.split('@')[0] ||
          'Aura Assistant'
        ).toString().trim();

        const slug = buildProfileSlug({
          personaSettings,
          profile,
          fallbackName: displayName,
          fallbackId: user.user_id
        });

        const initials = displayName
          .split(' ')
          .filter(Boolean)
          .map(word => word.charAt(0))
          .join('')
          .toUpperCase()
          .substring(0, 2) || 'AA';

        const avatarUrl = personaSettings.avatar_url ||
          personaSettings.avatarUrl ||
          personaSettings.profile_picture ||
          personaSettings.photo_url ||
          profile?.avatar_url ||
          (profile?.avatar_path ? getPublicAvatarUrl(profile.avatar_path) : null);

        const expertiseAreas = Array.isArray(preference?.expertise_areas)
          ? preference.expertise_areas.filter(Boolean)
          : [];
        const personaTags = Array.isArray(personaSettings.tags)
          ? personaSettings.tags.filter(Boolean)
          : [];
        const combinedTags = Array.from(new Set([...expertiseAreas, ...personaTags]));

        let category = personaSettings.category || 'business';
        const normalizedTags = combinedTags.map(tag => tag.toLowerCase());
        if (normalizedTags.some(tag => ['healthcare', 'medical', 'medicine'].includes(tag))) {
          category = 'healthcare';
        } else if (normalizedTags.some(tag => ['technology', 'tech', 'engineering'].includes(tag))) {
          category = 'tech';
        } else if (normalizedTags.some(tag => ['education', 'teaching', 'learning'].includes(tag))) {
          category = 'education';
        } else if (normalizedTags.some(tag => ['support', 'customer-service', 'service', 'cx'].includes(tag))) {
          category = 'customer-service';
        } else if (normalizedTags.some(tag => ['finance', 'business', 'sales'].includes(tag))) {
          category = 'business';
        }

        let description = (
          personaSettings.bio ||
          personaSettings.description ||
          profile?.bio ||
          ''
        ).toString().trim();
        if (!description) {
          const communication = preference?.communication_style ? `${preference.communication_style} communication style` : null;
          const expertiseText = combinedTags.length > 0 ? `Specializing in ${combinedTags.slice(0, 3).join(', ')}.` : null;
          description = ['Professional AI assistant', communication, expertiseText].filter(Boolean).join(' ');
        }

        const totalChats = userStats.length;
        const averageMessages = totalChats === 0
          ? 0
          : Math.round(userStats.reduce((sum, stat) => sum + (stat.message_count || 0), 0) / totalChats);

        const confidence = persona?.confidence ?? 0.8;
        const sessionsCount = persona?.sessions_count ?? totalChats;
        const ratingBase = confidence * 5;
        const rating = Math.min(5, Math.max(3, ratingBase + (sessionsCount > 10 ? 0.2 : 0)));

        let responseTimeSeconds = 1.5;
        if (preference?.response_pace === 'fast') responseTimeSeconds = 0.9;
        if (preference?.response_pace === 'slow') responseTimeSeconds = 2.1;

        const responseTimeLabel = responseTimeSeconds <= 1
          ? '<1s'
          : `${responseTimeSeconds.toFixed(1)}s`;

        return {
          id: user.user_id,
          name: displayName,
          slug,
          title: personaSettings.title || profile?.title || `${displayName.split(' ')[0] || displayName}'s AI Assistant`,
          category,
          description,
          bio: personaSettings.bio || profile?.bio || '',
          avatar: initials,
          avatarUrl,
          rating: parseFloat(rating.toFixed(1)),
          totalChats,
          averageMessages,
          tags: combinedTags.slice(0, 3).map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)),
          categories: combinedTags.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)),
          isVerified: ['owner', 'admin'].includes((user.role || '').toLowerCase()) || totalChats > 50,
          lastActive: persona?.last_updated || user.created_at || profile?.created_at,
          responseTime: responseTimeLabel,
          responseTimeSeconds,
          email: user.email || profile?.email || null,
          tenantId: user.tenant_id,
          confidence,
          sessionsCount,
          persona,
          preferences: preference
        };
      });

      setChatbots(processedChatbots);
      setError(null);
    } catch (err) {
      setError('Failed to load chatbots. Please try again.');
      console.error('Error fetching chatbots:', err);

      if (process.env.REACT_APP_ENVIRONMENT === 'production') {
        setChatbots([]);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  // Filter and sort chatbots
  const filteredAndSortedChatbots = useMemo(() => {
    let filtered = [...chatbots];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(chatbot =>
        chatbot.name.toLowerCase().includes(query) ||
        chatbot.title.toLowerCase().includes(query) ||
        chatbot.description.toLowerCase().includes(query) ||
        chatbot.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(chatbot => chatbot.category === selectedCategory);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.totalChats - a.totalChats;
        case 'recent':
          return new Date(b.lastActive) - new Date(a.lastActive);
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [chatbots, searchQuery, selectedCategory, sortBy]);

  // Get category counts
  const getCategoryCount = (categoryId) => {
    if (categoryId === 'all') return chatbots.length;
    return chatbots.filter(chatbot => chatbot.category === categoryId).length;
  };

  // Format last active time
  const formatLastActive = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="explore-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Explore Voice AI</h1>
            <p className="page-description">
              Discover intelligent voice assistants created by professionals worldwide. 
              Try different personalities and find the perfect AI for your needs.
            </p>
          </div>
          
          {!isAuthenticated && (
            <div className="header-cta">
              <Link to="/register" className="btn btn-primary">
                Create Your AI
              </Link>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="controls-section">
          {/* Search Bar */}
          <div className="search-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search by name, specialty, or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <div className="search-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
            </div>
          </div>

          {/* Filters and Sort */}
          <div className="filters-container">
            <div className="filter-group">
              <label className="filter-label">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.label} ({getCategoryCount(category.id)})
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                {sortOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="results-info">
          <p className="results-count">
            {loading ? 'Loading...' : `${filteredAndSortedChatbots.length} AI assistant${filteredAndSortedChatbots.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {loading ? (
            <div className="loading-state">
              <LoadingSpinner size="large" message="Loading AI assistants..." />
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3 className="error-title">Unable to load chatbots</h3>
              <p className="error-message">{error}</p>
              <button onClick={fetchChatbots} className="btn btn-primary">
                Try Again
              </button>
            </div>
          ) : filteredAndSortedChatbots.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">No Results</div>
              <h3 className="empty-title">No AI assistants found</h3>
              <p className="empty-message">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="chatbots-grid">
              {filteredAndSortedChatbots.map(chatbot => (
                <ChatbotCard key={chatbot.id} chatbot={chatbot} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .explore-page {
          padding: var(--space-6) 0 var(--space-20);
          min-height: calc(100vh - 80px);
          background: var(--gray-50);
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-12);
          gap: var(--space-8);
        }

        .header-content {
          flex: 1;
        }

        .page-title {
          font-size: var(--text-4xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-4);
        }

        .page-description {
          font-size: var(--text-lg);
          color: var(--gray-600);
          line-height: 1.6;
          max-width: 600px;
        }

        .header-cta {
          flex-shrink: 0;
        }

        .controls-section {
          background: var(--white);
          border-radius: var(--radius-2xl);
          padding: var(--space-6);
          margin-bottom: var(--space-6);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
        }

        .search-container {
          margin-bottom: var(--space-6);
        }

        .search-input-wrapper {
          position: relative;
          max-width: 500px;
        }

        .search-input {
          width: 100%;
          padding: var(--space-3) var(--space-4);
          padding-right: var(--space-12);
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-lg);
          font-size: var(--text-base);
          background: var(--white);
          transition: all var(--transition-fast);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--primary-600);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .search-input::placeholder {
          color: var(--gray-400);
        }

        .search-icon {
          position: absolute;
          right: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400);
          pointer-events: none;
        }

        .filters-container {
          display: flex;
          gap: var(--space-6);
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          min-width: 200px;
        }

        .filter-label {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--gray-700);
        }

        .filter-select {
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          background: var(--white);
          cursor: pointer;
          transition: border-color var(--transition-fast);
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--primary-600);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .results-info {
          margin-bottom: var(--space-6);
        }

        .results-count {
          color: var(--gray-600);
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
        }

        .content-area {
          min-height: 400px;
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-16);
          text-align: center;
        }

        .error-icon,
        .empty-icon {
          font-size: 4rem;
          margin-bottom: var(--space-4);
        }

        .error-title,
        .empty-title {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-3);
        }

        .error-message,
        .empty-message {
          color: var(--gray-600);
          font-size: var(--text-base);
          margin-bottom: var(--space-6);
          max-width: 400px;
        }

        .chatbots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: var(--space-6);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: var(--space-4);
            text-align: center;
          }

          .filters-container {
            flex-direction: column;
            gap: var(--space-4);
          }

          .filter-group {
            min-width: auto;
          }

          .chatbots-grid {
            grid-template-columns: 1fr;
            gap: var(--space-4);
          }

          .search-input-wrapper {
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
};

// Individual Chatbot Card Component
const ChatbotCard = ({ chatbot }) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    if (chatbot.slug) {
      navigate(`/chat/${chatbot.slug}`);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigate();
    }
  };

  return (
    <div
      className="chatbot-card"
      role="link"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
    >
      <div className="card-header">
        <div className="avatar-section">
          <div className="chatbot-avatar">
            {chatbot.avatarUrl ? (
              <img src={chatbot.avatarUrl} alt={`${chatbot.name} avatar`} />
            ) : (
              <span>{chatbot.avatar}</span>
            )}
          </div>
          <div className="verification-badge">
            {chatbot.isVerified && (
              <div className="verified-icon" title="Verified">
                ✓
              </div>
            )}
          </div>
        </div>
        
        <div className="card-actions">
          <div className="rating">
            <span className="star">⭐</span>
            <span className="rating-score">{chatbot.rating}</span>
          </div>
        </div>
      </div>

      <div className="card-content">
        <h3 className="chatbot-name">{chatbot.name}</h3>
        <p className="chatbot-title">{chatbot.title}</p>
        <p className="chatbot-description">{chatbot.description}</p>
        
        <div className="chatbot-tags">
          {chatbot.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
        </div>
      </div>

      <div className="card-stats">
        <div className="stat-item">
          <span className="stat-label">Conversations</span>
          <span className="stat-value">{chatbot.totalChats.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Response Time</span>
          <span className="stat-value">{chatbot.responseTime}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Last Active</span>
          <span className="stat-value">{formatLastActive(chatbot.lastActive)}</span>
        </div>
      </div>

      <div className="card-footer">
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={(event) => {
            event.stopPropagation();
            handleNavigate();
          }}
        >
          Start Conversation
        </button>
      </div>

      <style jsx>{`
        .chatbot-card {
          background: var(--white);
          border-radius: var(--radius-2xl);
          padding: var(--space-6);
          border: 1px solid var(--gray-200);
          transition: all var(--transition-normal);
          box-shadow: var(--shadow-sm);
          cursor: pointer;
        }

        .chatbot-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary-200);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-4);
        }

        .avatar-section {
          position: relative;
        }

        .chatbot-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
        }

        .chatbot-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .chatbot-avatar span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .verification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
        }

        .verified-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--success-500);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .rating {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          background: var(--gray-100);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-md);
        }

        .star {
          font-size: var(--text-sm);
        }

        .rating-score {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--gray-700);
        }

        .card-content {
          margin-bottom: var(--space-5);
        }

        .chatbot-name {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .chatbot-title {
          font-size: var(--text-base);
          font-weight: var(--font-weight-medium);
          color: var(--primary-600);
          margin-bottom: var(--space-3);
        }

        .chatbot-description {
          color: var(--gray-600);
          font-size: var(--text-sm);
          line-height: 1.6;
          margin-bottom: var(--space-4);
        }

        .chatbot-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }

        .tag {
          background: var(--gray-100);
          color: var(--gray-700);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          font-weight: var(--font-weight-medium);
        }

        .card-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
          margin-bottom: var(--space-5);
          padding: var(--space-4) 0;
          border-top: 1px solid var(--gray-200);
          border-bottom: 1px solid var(--gray-200);
        }

        .stat-item {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: var(--text-xs);
          color: var(--gray-500);
          margin-bottom: var(--space-1);
        }

        .stat-value {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
        }

        .card-footer {
          display: flex;
          gap: var(--space-3);
        }

        .w-full {
          width: 100%;
        }

        /* Mobile Responsiveness */
        @media (max-width: 480px) {
          .card-stats {
            grid-template-columns: 1fr 1fr;
            gap: var(--space-2);
          }
          
          .card-stats .stat-item:last-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
};

// Helper function (needs to be outside component for proper scoping)
const formatLastActive = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Active now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
};

export default ExplorePage;