// Aura Voice AI - Individual Profile & Voice Chat Component
// =========================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { buildProfileSlug, isPermissionError, sanitizeSlug } from '../../utils/slugUtils';
import { copyTextToClipboard } from '../../utils/clipboard';

/**
 * VoiceChat Component
 * 
 * Individual profile page for each AI assistant
 * Similar to Delphi's individual profile pages
 * Connects to Supabase to fetch user data by slug
 */
const PROFILE_BUCKET = process.env.REACT_APP_SUPABASE_AVATAR_BUCKET || 'avatars';
const looksLikeEmail = (value) => /@/.test((value || '').toString());
const sanitizeDisplayText = (value) => {
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

const VoiceChat = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { supabase, isAuthenticated } = useAuth();

  // State management
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChatting, setIsChatting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [questionInput, setQuestionInput] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [shareStatus, setShareStatus] = useState('idle');

  useEffect(() => {
    if (isAuthenticated) {
      setShowLoginPrompt(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (shareStatus === 'idle') {
      return undefined;
    }
    const timeout = setTimeout(() => setShareStatus('idle'), 2500);
    return () => clearTimeout(timeout);
  }, [shareStatus]);

  const getPublicAvatarUrl = useCallback((path) => {
    if (!path || !supabase) {
      return null;
    }

    const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  }, [supabase]);

  // Fetch user profile from Supabase
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const rawSlug = slug || '';
      const slugSegments = rawSlug.split('/').filter(Boolean);
      const slugCandidates = Array.from(new Set([
        sanitizeSlug(rawSlug),
        ...slugSegments.map(segment => sanitizeSlug(segment))
      ])).filter(Boolean);

      let permissionDenied = false;
      let lastPermissionError = null;
      let profileRecord = null;

      if (slugCandidates.length > 0) {
        const { data: profileMatches, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, email, full_name, bio, title, avatar_path, created_at')
          .in('username', slugCandidates)
          .limit(1);

        if (profileError) {
          if (isPermissionError(profileError)) {
            permissionDenied = true;
            lastPermissionError = profileError;
          } else {
            throw profileError;
          }
        } else if (profileMatches && profileMatches.length > 0) {
          profileRecord = profileMatches[0];
        }
      }

      if (!profileRecord && slugCandidates.length > 0) {
        const { data: fallbackProfiles, error: fallbackProfilesError } = await supabase
          .from('profiles')
          .select('id, username, email, full_name, bio, title, avatar_path, created_at')
          .limit(200);

        if (fallbackProfilesError) {
          if (isPermissionError(fallbackProfilesError)) {
            permissionDenied = true;
            lastPermissionError = fallbackProfilesError;
          } else {
            throw fallbackProfilesError;
          }
        } else if (fallbackProfiles && fallbackProfiles.length > 0) {
          const derivedMatch = fallbackProfiles.find((profileCandidate) => {
            const fallbackName = (
              profileCandidate.full_name ||
              profileCandidate.username ||
              profileCandidate.email?.split('@')[0] ||
              'Aura Assistant'
            )
              .toString()
              .trim();

            const derivedSlug = buildProfileSlug({
              personaSettings: {},
              profile: profileCandidate,
              fallbackName,
              fallbackId: profileCandidate.id
            });

            return slugCandidates.includes(derivedSlug);
          });

          if (derivedMatch) {
            profileRecord = derivedMatch;
          }
        }
      }

      if (!profileRecord) {
        if (lastPermissionError) {
          throw lastPermissionError;
        }
        throw new Error('Profile not found');
      }

      let matchedUser = null;

      if (profileRecord) {
        const { data: tenantMatch, error: tenantError } = await supabase
          .from('tenant_users')
          .select('user_id, tenant_id, email, name, role, persona_settings, voice_preference, created_at')
          .eq('user_id', profileRecord.id)
          .maybeSingle();

        if (tenantError) {
          if (isPermissionError(tenantError)) {
            permissionDenied = true;
            matchedUser = {
              user_id: profileRecord.id,
              tenant_id: null,
              email: profileRecord.email,
              name: profileRecord.full_name,
              role: null,
              persona_settings: {},
              voice_preference: null,
              created_at: profileRecord.created_at
            };
          } else {
            throw tenantError;
          }
        } else {
          matchedUser = tenantMatch;
        }
      }

      let profilesMap = new Map(profileRecord ? [[profileRecord.id, profileRecord]] : []);

      if (!matchedUser) {
        const { data: tenantCandidates, error: tenantError } = await supabase
          .from('tenant_users')
          .select('user_id, tenant_id, email, name, role, persona_settings, voice_preference, created_at')
          .limit(200);

        if (tenantError) {
          if (isPermissionError(tenantError)) {
            permissionDenied = true;
          } else {
            throw tenantError;
          }
        }

        const candidates = tenantCandidates || [];

        if (candidates.length > 0) {
          const candidateIds = candidates.map(item => item.user_id).filter(Boolean);

          if (candidateIds.length > 0) {
            const { data: candidateProfiles, error: candidateProfileError } = await supabase
              .from('profiles')
              .select('id, username, email, full_name, bio, title, avatar_path, created_at')
              .in('id', candidateIds);

            if (candidateProfileError) {
              if (isPermissionError(candidateProfileError)) {
                permissionDenied = true;
              } else {
                throw candidateProfileError;
              }
            } else {
              profilesMap = new Map(candidateProfiles.map(item => [item.id, item]));
            }
          }

          const candidateMatch = candidates.find((candidate) => {
            const personaSettings = candidate.persona_settings || {};
            const candidateProfile = profilesMap.get(candidate.user_id) || null;
            const fallbackName = (
              personaSettings.display_name ||
              personaSettings.name ||
              candidateProfile?.full_name ||
              candidate.name ||
              candidate.email?.split('@')[0] ||
              'Aura Assistant'
            ).toString().trim();

            const candidateSlug = buildProfileSlug({
              personaSettings,
              profile: candidateProfile,
              fallbackName,
              fallbackId: candidate.user_id
            });

            return slugCandidates.includes(candidateSlug);
          }) || null;

          if (candidateMatch) {
            matchedUser = candidateMatch;
            profileRecord = profilesMap.get(candidateMatch.user_id) || profileRecord;
          }
        }
      }

      if (!matchedUser) {
        matchedUser = {
          user_id: profileRecord.id,
          tenant_id: null,
          email: profileRecord.email,
          name: profileRecord.full_name,
          role: null,
          persona_settings: {},
          voice_preference: null,
          created_at: profileRecord.created_at
        };
      }

      const [personaResult, preferenceResult, conversationsResult] = await Promise.all([
        supabase
          .from('user_personas')
          .select('user_id, formality, detail_level, example_style, questioning, energy, confidence, sessions_count, last_updated')
          .eq('user_id', matchedUser.user_id)
          .maybeSingle(),
        supabase
          .from('user_preferences')
          .select('user_id, communication_style, response_pace, expertise_areas, preferred_examples')
          .eq('user_id', matchedUser.user_id)
          .maybeSingle(),
        supabase
          .from('conversation_summaries')
          .select('session_id, message_count, key_topics, timestamp')
          .eq('user_id', matchedUser.user_id)
          .order('timestamp', { ascending: false })
      ]);

      const personaSettings = matchedUser.persona_settings || {};
      const profileDetails = profileRecord || null;

      const displayName =
        [
          personaSettings.display_name,
          personaSettings.name,
          profileDetails?.full_name,
          profileDetails?.display_name,
          matchedUser.name
        ]
          .map(sanitizeDisplayText)
          .find(Boolean) ||
        sanitizeDisplayText(profileDetails?.username) ||
        sanitizeDisplayText(matchedUser.email?.split('@')[0]) ||
        'Aura Assistant';

      const resolvedSlug = buildProfileSlug({
        personaSettings,
        profile: profileDetails,
        fallbackName: displayName,
        fallbackId: matchedUser.user_id
      });

      let voicePreference = matchedUser.voice_preference || null;

      const normalizeVoicePreference = (preference) => {
        if (!preference) {
          return null;
        }

        if (typeof preference === 'string') {
          return {
            voice_id: preference,
          };
        }

        if (preference?.voice_id || preference?.voiceId) {
          return preference;
        }

        if (preference?.params && typeof preference.params === 'object') {
          const derivedVoiceId =
            preference.params.voice_id ||
            preference.params.voiceId ||
            null;

          if (derivedVoiceId) {
            return {
              ...preference,
              voice_id: preference.voice_id || derivedVoiceId,
            };
          }
        }

        return preference;
      };

      if (!voicePreference) {
        const assistantKeyCandidates = new Set(
          [
            personaSettings.assistant_key,
            personaSettings.assistantKey,
            personaSettings.slug,
            personaSettings.slug?.toString().trim().toLowerCase(),
            personaSettings.identifier,
            personaSettings.voice_assistant_key,
            personaSettings.voiceAssistantKey,
            personaSettings.id,
            personaSettings.key,
            profileDetails?.username,
            profileDetails?.username?.toString().trim().toLowerCase(),
            matchedUser.user_id,
            matchedUser.user_id ? matchedUser.user_id.toString() : '',
            matchedUser.email?.split('@')[0],
            resolvedSlug,
            slug,
          ]
            .concat(Array.from(slugCandidates))
            .map((value) => (value ? value.toString().trim() : ''))
            .filter(Boolean)
        );

        if (assistantKeyCandidates.size > 0) {
          let voicePrefQuery = supabase
            .from('assistant_voice_prefs')
            .select('id, tenant_id, assistant_key, provider, voice_id, model, params')
            .order('updated_at', { ascending: false })
            .limit(1);

          if (matchedUser.tenant_id) {
            voicePrefQuery = voicePrefQuery.eq('tenant_id', matchedUser.tenant_id);
          }

          const { data: voicePrefMatches, error: voicePrefError } = await voicePrefQuery.in(
            'assistant_key',
            Array.from(assistantKeyCandidates)
          );

          if (voicePrefError) {
            if (isPermissionError(voicePrefError)) {
              permissionDenied = true;
            } else {
              throw voicePrefError;
            }
          } else if (voicePrefMatches && voicePrefMatches.length > 0) {
            voicePreference = voicePrefMatches[0];
          }
        }
      }

      voicePreference = normalizeVoicePreference(voicePreference);

      let persona = null;
      if (personaResult.error) {
        if (isPermissionError(personaResult.error)) {
          permissionDenied = true;
        } else {
          throw personaResult.error;
        }
      } else {
        persona = personaResult.data || null;
      }

      let preferences = null;
      if (preferenceResult.error) {
        if (isPermissionError(preferenceResult.error)) {
          permissionDenied = true;
        } else {
          throw preferenceResult.error;
        }
      } else {
        preferences = preferenceResult.data || null;
      }

      let conversations = [];
      if (conversationsResult.error) {
        if (isPermissionError(conversationsResult.error)) {
          permissionDenied = true;
        } else {
          throw conversationsResult.error;
        }
      } else {
        conversations = conversationsResult.data || [];
      }

      const avatarInitials = displayName
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'AA';

      const avatarUrl =
        personaSettings.avatar_url ||
        personaSettings.avatarUrl ||
        personaSettings.profile_picture ||
        personaSettings.photo_url ||
        profileDetails?.avatar_url ||
        (profileDetails?.avatar_path ? getPublicAvatarUrl(profileDetails.avatar_path) : null);

      const username = sanitizeUsername(
        profileDetails?.username ||
        personaSettings.username ||
        matchedUser.username ||
        matchedUser.email?.split('@')[0]
      );

      const expertiseAreas = Array.isArray(preferences?.expertise_areas)
        ? preferences.expertise_areas.filter(Boolean)
        : [];

      const conversationsCount = conversations.length;
      const totalMessages = conversations.reduce((sum, conv) => sum + (conv.message_count || 0), 0);

      const processedProfile = {
        id: matchedUser.user_id,
        name: displayName,
        fullName: sanitizeDisplayText(profileDetails?.full_name) || sanitizeDisplayText(matchedUser.name) || displayName,
        slug: resolvedSlug,
        email: matchedUser.email || profileDetails?.email || null,
        tenantId: matchedUser.tenant_id,
        avatar: avatarInitials,
        avatarUrl,
        username,
        title: profileDetails?.title || personaSettings.title || generateTitle(displayName, expertiseAreas),
        bio:
          personaSettings.bio?.toString().trim() ||
          personaSettings.description?.toString().trim() ||
          profileDetails?.bio?.toString().trim() ||
          generateBio(preferences, persona),
        voicePreference: voicePreference || null,
        preferences,
        persona,
        totalConversations: conversationsCount,
        totalMessages,
        expertiseAreas,
        isVerified: ['owner', 'admin'].includes((matchedUser.role || '').toLowerCase()) || conversationsCount > 50,
        lastActive: persona?.last_updated || matchedUser.created_at || profileDetails?.created_at,
        joinedDate: matchedUser.created_at || profileDetails?.created_at,
        suggestedQuestions: generateSuggestedQuestions(expertiseAreas),
        keyTopics: conversations
          .flatMap(conv => Array.isArray(conv.key_topics) ? conv.key_topics : [])
          .slice(0, 6)
      };

      setAvatarError(false);
      setProfile(processedProfile);
      setError(null);
    } catch (err) {
      if (isPermissionError(err)) {
        setError('This assistant is private. Please sign in to view full details.');
      } else {
        setError(err.message || 'Failed to load profile');
      }
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [getPublicAvatarUrl, slug, supabase]);


  // Fetch profile data on component mount
  useEffect(() => {
    if (slug) {
      fetchProfile();
    }
  }, [slug, fetchProfile]);



  // Generate title from name and expertise
  const generateTitle = (name, expertiseAreas) => {
    const firstName = name.split(' ')[0];
    if (!expertiseAreas || expertiseAreas.length === 0) {
      return `${firstName}'s AI Assistant`;
    }
    
    const primaryExpertise = expertiseAreas[0];
    const titleMap = {
      'business': 'Business Advisor',
      'finance': 'Financial Consultant', 
      'healthcare': 'Health & Wellness Coach',
      'technology': 'Tech Expert',
      'education': 'Learning Mentor',
      'customer-service': 'Support Specialist',
      'marketing': 'Marketing Strategist',
      'legal': 'Legal Advisor'
    };
    
    return titleMap[primaryExpertise] || `${primaryExpertise.charAt(0).toUpperCase() + primaryExpertise.slice(1)} Expert`;
  };

  // Generate bio from preferences and persona
  const generateBio = (preferences, persona) => {
    let bio = "I'm an AI assistant designed to help with ";
    
    if (preferences?.expertise_areas && preferences.expertise_areas.length > 0) {
      bio += preferences.expertise_areas.slice(0, 3).join(', ');
    } else {
      bio += "various topics and questions";
    }
    
    bio += ". ";
    
    if (preferences?.communication_style) {
      bio += `I communicate in a ${preferences.communication_style} style `;
    }
    
    if (persona?.confidence) {
      const confidenceLevel = persona.confidence > 0.8 ? "highly confident" : 
                             persona.confidence > 0.6 ? "confident" : "thoughtful";
      bio += `and provide ${confidenceLevel} responses. `;
    }
    
    bio += "Feel free to ask me anything within my areas of expertise!";
    
    return bio;
  };

  // Generate suggested questions based on expertise areas
  const generateSuggestedQuestions = (expertiseAreas) => {
    const questionTemplates = {
      business: [
        "What are the key factors for building a successful startup?",
        "How can I improve my business strategy and market positioning?",
        "What metrics should I track to measure business performance?"
      ],
      finance: [
        "What investment strategies work best for long-term wealth building?",
        "How should I allocate my portfolio across different asset classes?",
        "What are the most important financial principles for entrepreneurs?"
      ],
      healthcare: [
        "What are some effective stress management techniques?",
        "How can I maintain better work-life balance?",
        "What daily habits contribute most to long-term health?"
      ],
      technology: [
        "What are the emerging tech trends I should be aware of?",
        "How can I improve my company's digital transformation?",
        "What cybersecurity measures are essential for businesses?"
      ],
      education: [
        "What are the most effective learning strategies for professionals?",
        "How can I develop better critical thinking skills?",
        "What skills will be most valuable in the future job market?"
      ],
      'customer-service': [
        "How can I improve customer satisfaction and retention?",
        "What are the best practices for handling difficult customers?",
        "How can I scale customer support efficiently?"
      ]
    };

    if (!expertiseAreas || expertiseAreas.length === 0) {
      return [
        "What topics can you help me with?",
        "How can you assist with my current challenges?",
        "What's your approach to problem-solving?"
      ];
    }

    // Get questions from the first expertise area
    const primaryArea = expertiseAreas[0];
    return questionTemplates[primaryArea] || [
      `What advice do you have about ${primaryArea}?`,
      `How can you help me with ${primaryArea}-related questions?`,
      `What are the key principles in ${primaryArea}?`
    ];
  };

  // Handle suggested question click
  const handleQuestionClick = (question) => {
    setQuestionInput(question);
  };

  const shareUrl = useMemo(() => {
    if (!profile?.slug) {
      return '';
    }
    return `https://www.iaura.ai/chat/${profile.slug}`;
  }, [profile?.slug]);

  const handleCopyShareLink = async () => {
    if (!shareUrl) {
      setShareStatus('error');
      return;
    }

    const success = await copyTextToClipboard(shareUrl);
    setShareStatus(success ? 'copied' : 'error');
  };

  // Handle text chat submission
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!questionInput.trim()) return;

    const userMessage = questionInput.trim();
    setQuestionInput('');
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user', 
      content: userMessage,
      timestamp: new Date()
    }]);

    setIsChatting(true);

    try {
      // Call the backend API to get AI response
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://api.iaura.ai'}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          user_id: profile?.id || 'anonymous',
          organization: 'default_org',
          use_documents: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add AI response to chat
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        content: data.response || 'I received your message but couldn\'t generate a proper response.',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I encountered an error connecting to the AI service. Please make sure the backend server is running and try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsChatting(false);
    }
  };

  // Navigate to dedicated voice call session for this assistant
  const handleStartCall = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    const targetSlug = profile?.slug || slug;
    if (!targetSlug) {
      return;
    }

    setShowLoginPrompt(false);

    navigate(`/chat/${targetSlug}/call`, {
      state: profile ? { profile } : undefined,
    });
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="voice-chat-page">
        <div className="container">
          <div className="loading-container">
            <LoadingSpinner size="large" message="Loading profile..." />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="voice-chat-page">
        <div className="container">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Profile Not Found</h2>
            <p className="error-message">{error}</p>
            <div className="error-actions">
              <button onClick={() => navigate('/explore')} className="btn btn-primary">
                ← Back to Explore
              </button>
              <button onClick={fetchProfile} className="btn btn-secondary">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-chat-page">
      <div className="container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-info">
            <div className="profile-avatar">
              <div className="avatar-circle">
                {!avatarError && profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName || profile.name}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  profile.avatar
                )}
              </div>
              {profile.isVerified && (
                <div className="verification-badge">
                  <span className="verified-icon">✓</span>
                </div>
              )}
            </div>

            <div className="profile-details">
              <h1 className="profile-name">
                {profile.fullName || profile.name}
                {profile.isVerified && <span className="verified-text">✓</span>}
              </h1>
              {profile.username && (
                <p className="profile-username">@{profile.username}</p>
              )}
              <p className="profile-title">{profile.title}</p>
              <p className="profile-bio">{profile.bio}</p>
              
              {/* Stats */}
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-number">{profile.totalConversations}</span>
                  <span className="stat-label">Conversations</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{profile.totalMessages}</span>
                  <span className="stat-label">Messages</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{formatDate(profile.joinedDate)}</span>
                  <span className="stat-label">Joined</span>
                </div>
              </div>

              {/* Expertise Tags */}
              {profile.expertiseAreas.length > 0 && (
                <div className="expertise-tags">
                  {profile.expertiseAreas.map((area, index) => (
                    <span key={index} className="expertise-tag">
                      {area.charAt(0).toUpperCase() + area.slice(1)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-actions">
            <button
              onClick={handleStartCall}
              className="btn btn-primary btn-lg voice-btn"
            >
              Start Call
            </button>
            <button 
              className="btn btn-secondary btn-lg"
              onClick={() => {
                const chatSection = document.querySelector('.chat-section');
                if (chatSection) {
                  chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // Focus on the chat input after scrolling
                  setTimeout(() => {
                    const chatInput = document.querySelector('.chat-input');
                    if (chatInput) {
                      chatInput.focus();
                    }
                  }, 500);
                }
              }}
            >
              Open Chat
            </button>
          </div>

          <div className="profile-share">
            <div className="share-text">
              <span className="share-label">Share this assistant</span>
              <span className="share-link">
                {shareUrl || 'Update this profile to unlock sharing'}
              </span>
            </div>
            <button
              type="button"
              className={`share-button ${shareStatus}`}
              onClick={handleCopyShareLink}
              disabled={!shareUrl}
            >
              {shareStatus === 'copied'
                ? 'Link Copied!'
                : shareStatus === 'error'
                ? 'Copy Failed'
                : 'Copy Chat Link'}
            </button>
          </div>

          {showLoginPrompt && (
            <div className="call-login-prompt" role="alert">
              <p>
                Please sign in to start a voice call with {profile.name.split(' ')[0]}.
              </p>
              <div className="call-login-actions">
                <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
                <Link to="/register" className="btn btn-secondary btn-sm">Create Account</Link>
              </div>
            </div>
          )}

        </div>

        {/* Main Content */}
        <div className="voice-chat-content">
          {/* Suggested Questions */}
          <div className="suggested-questions">
            <h3 className="section-title">Suggested Questions</h3>
            <div className="questions-grid">
              {profile.suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuestionClick(question)}
                  className="question-card"
                >
                  <span className="question-icon" aria-hidden="true">Q</span>
                  <span className="question-text">{question}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="chat-section">
            <h3 className="section-title">Ask {profile.name.split(' ')[0]} a question</h3>
            
            {/* Chat Messages */}
            {messages.length > 0 && (
              <div className="chat-messages">
                {messages.map((message) => (
                  <div key={message.id} className={`message ${message.type}`}>
                    <div className="message-content">
                      {message.content}
                    </div>
                    <div className="message-time">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="message ai typing">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="chat-form">
              <div className="chat-input-container">
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder={`Ask ${profile.name.split(' ')[0]} a question...`}
                  className="chat-input"
                  disabled={isChatting}
                />
                <button 
                  type="submit" 
                  disabled={!questionInput.trim() || isChatting}
                  className="send-button"
                >
                  {isChatting ? <LoadingSpinner size="small" /> : '→'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .voice-chat-page {
          padding: var(--space-6) 0 var(--space-20);
          min-height: calc(100vh - 80px);
          background: var(--gray-50);
        }

        .loading-container,
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-20);
          text-align: center;
        }

        .error-icon {
          font-size: 4rem;
          margin-bottom: var(--space-4);
        }

        .error-title {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-3);
        }

        .error-message {
          color: var(--gray-600);
          margin-bottom: var(--space-6);
        }

        .error-actions {
          display: flex;
          gap: var(--space-3);
        }

        /* Profile Header */
        .profile-header {
          background: var(--white);
          border-radius: var(--radius-2xl);
          padding: var(--space-8);
          margin-bottom: var(--space-8);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-8);
        }

        .profile-info {
          display: flex;
          gap: var(--space-6);
          flex: 1;
        }

        .profile-avatar {
          position: relative;
          flex-shrink: 0;
        }

        .avatar-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
          font-size: var(--text-4xl);
          font-weight: var(--font-weight-bold);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          position: relative;
        }

        .avatar-circle::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.35);
          pointer-events: none;
        }

        .avatar-circle img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .verification-badge {
          position: absolute;
          bottom: 5px;
          right: 5px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--success-500);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--white);
        }

        .verified-icon {
          color: var(--white);
          font-weight: bold;
          font-size: var(--text-sm);
        }

        .profile-details {
          flex: 1;
        }

        .profile-name {
          font-size: var(--text-4xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-2);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .profile-username {
          font-size: var(--text-base);
          color: var(--gray-500);
          margin-bottom: var(--space-2);
        }

        .verified-text {
          color: var(--success-500);
          font-size: var(--text-2xl);
        }

        .profile-title {
          font-size: var(--text-xl);
          color: var(--primary-600);
          font-weight: var(--font-weight-medium);
          margin-bottom: var(--space-4);
        }

        .profile-bio {
          font-size: var(--text-base);
          color: var(--gray-700);
          line-height: 1.6;
          margin-bottom: var(--space-6);
          max-width: 600px;
        }

        .profile-stats {
          display: flex;
          gap: var(--space-8);
          margin-bottom: var(--space-6);
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: var(--text-xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .stat-label {
          font-size: var(--text-sm);
          color: var(--gray-500);
          font-weight: var(--font-weight-medium);
        }

        .expertise-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }

        .expertise-tag {
          background: var(--primary-100);
          color: var(--primary-700);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
        }

        .profile-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          flex-shrink: 0;
        }

        .profile-share {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
          padding: var(--space-4);
          background: var(--gray-50);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          flex-basis: 100%;
          margin-top: var(--space-4);
        }

        .profile-share .share-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .profile-share .share-label {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--gray-600);
        }

        .profile-share .share-link {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: var(--text-sm);
          color: var(--gray-800);
          word-break: break-all;
        }

        .profile-share .share-button {
          border: none;
          background: var(--primary-600);
          color: var(--white);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-lg);
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: background var(--transition-fast), transform var(--transition-fast);
          min-width: 170px;
        }

        .profile-share .share-button:hover:not(:disabled) {
          background: var(--primary-700);
          transform: translateY(-1px);
        }

        .profile-share .share-button:disabled {
          background: var(--gray-300);
          cursor: not-allowed;
        }

        .profile-share .share-button.copied {
          background: var(--success-500);
        }

        .profile-share .share-button.error {
          background: var(--error-500);
        }

        .call-login-prompt {
          margin-top: var(--space-4);
          padding: var(--space-4);
          border-radius: var(--radius-lg);
          background: var(--error-100);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: var(--gray-700);
        }

        .call-login-prompt p {
          margin-bottom: var(--space-3);
          font-size: var(--text-sm);
        }

        .call-login-actions {
          display: flex;
          gap: var(--space-3);
        }

        /* Main Content */
        .voice-chat-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-8);
        }

        .section-title {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-6);
        }

        /* Suggested Questions */
        .suggested-questions {
          background: var(--white);
          border-radius: var(--radius-2xl);
          padding: var(--space-6);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
          height: fit-content;
        }

        .questions-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .question-card {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-4);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          background: var(--white);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }

        .question-card:hover {
          border-color: var(--primary-300);
          background: var(--primary-50);
          transform: translateY(-1px);
        }

        .question-icon {
          font-size: var(--text-lg);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .question-text {
          color: var(--gray-700);
          font-size: var(--text-base);
          line-height: 1.5;
        }

        /* Chat Section */
        .chat-section {
          background: var(--white);
          border-radius: var(--radius-2xl);
          padding: var(--space-6);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
          display: flex;
          flex-direction: column;
          height: fit-content;
          min-height: 500px;
        }

        .chat-messages {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
          max-height: 400px;
          overflow-y: auto;
          padding: var(--space-4);
          background: var(--gray-50);
          border-radius: var(--radius-lg);
        }

        .message {
          display: flex;
          flex-direction: column;
          max-width: 80%;
        }

        .message.user {
          align-self: flex-end;
          align-items: flex-end;
        }

        .message.ai {
          align-self: flex-start;
          align-items: flex-start;
        }

        .message-content {
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-lg);
          font-size: var(--text-base);
          line-height: 1.5;
        }

        .message.user .message-content {
          background: var(--primary-600);
          color: var(--white);
        }

        .message.ai .message-content {
          background: var(--white);
          color: var(--gray-800);
          border: 1px solid var(--gray-200);
        }

        .message-time {
          font-size: var(--text-xs);
          color: var(--gray-500);
          margin-top: var(--space-1);
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: var(--space-3) var(--space-4);
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--gray-400);
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0s; }

        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .chat-form {
          margin-top: auto;
        }

        .chat-input-container {
          display: flex;
          gap: var(--space-3);
        }

        .chat-input {
          flex: 1;
          padding: var(--space-3) var(--space-4);
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-lg);
          font-size: var(--text-base);
          background: var(--white);
          transition: border-color var(--transition-fast);
        }

        .chat-input:focus {
          outline: none;
          border-color: var(--primary-600);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .send-button {
          padding: var(--space-3) var(--space-4);
          background: var(--primary-600);
          color: var(--white);
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: background-color var(--transition-fast);
          min-width: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .send-button:hover:not(:disabled) {
          background: var(--primary-700);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
            text-align: center;
          }

          .profile-info {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .profile-actions {
            width: 100%;
            align-items: stretch;
          }

          .profile-share {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }

          .profile-share .share-text {
            align-items: center;
          }

          .profile-share .share-button {
            width: 100%;
          }

          .profile-stats {
            justify-content: center;
          }

          .voice-chat-content {
            grid-template-columns: 1fr;
          }

          .avatar-circle {
            width: 100px;
            height: 100px;
            font-size: var(--text-3xl);
          }

          .profile-name {
            font-size: var(--text-3xl);
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceChat;
