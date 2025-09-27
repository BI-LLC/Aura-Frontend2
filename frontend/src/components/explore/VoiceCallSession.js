// Aura Voice AI - Dedicated Voice Call Session
// ============================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// import voiceService from '../../services/voiceService'; // Currently unused
import LoadingSpinner from '../common/LoadingSpinner';

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

const VoiceCallSession = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const navigationProfile = location.state?.profile || null;

  const [profile] = useState(navigationProfile);
  // const [isMuted, setIsMuted] = useState(false); // Currently unused
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [autoResumePreference, setAutoResumePreference] = useState(true);
  const [pendingAutoResume, setPendingAutoResume] = useState(false);
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [shouldRestartAfterResponse, setShouldRestartAfterResponse] = useState(false);
  const transcriptRef = useRef(null);
  const websocketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const pendingAutoResumeRef = useRef(pendingAutoResume);
  const { user, getToken, isAuthenticated } = useAuth();

  const assistantName = profile?.name || 'Aura Assistant';
  const assistantFirstName = useMemo(
    () => assistantName.split(' ')[0] || 'Aura',
    [assistantName]
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    setElapsedSeconds(0);
    setAvatarFailed(false);
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [profile]);

  // Simple WebSocket connection for voice conversation
  const connectWebSocket = async () => {
    const rawToken = getToken && typeof getToken === 'function' ? getToken() : null;
    if (!rawToken) {
      setConnectionError('Authentication required. Please log in.');
      return false;
    }

    try {
      // Ensure token is properly formatted
      const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
      const wsUrl = `wss://api.iaura.ai/ws/voice/continuous?token=${encodeURIComponent(token)}`;
      console.log('Connecting to WebSocket:', wsUrl);
      console.log('User token:', token ? 'Present' : 'Missing');
      const ws = new WebSocket(wsUrl);
      
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        setTranscript(prev => [...prev, {
          speaker: 'System',
          text: 'Connected to AI assistant. You can start speaking.',
          timestamp: new Date()
        }]);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data.type);

          switch (data.type) {
            case 'user_transcript':
              setTranscript(prev => [...prev, {
                speaker: 'You',
                text: data.text,
                timestamp: new Date()
              }]);
              break;

            case 'ai_audio':
              if (data.audio) {
                try {
                  const audioBlob = new Blob([Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
                  const audioUrl = URL.createObjectURL(audioBlob);
                  const audio = new Audio(audioUrl);

                  setIsProcessing(false);
                  setIsAssistantSpeaking(true);
                  await audio.play();

                  setTranscript(prev => [...prev, {
                    speaker: assistantName,
                    text: data.text || 'AI responded',
                    timestamp: new Date()
                  }]);

                  audio.onended = () => {
                    setIsAssistantSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                    const shouldResume =
                      pendingAutoResumeRef.current &&
                      websocketRef.current?.readyState === WebSocket.OPEN;

                    setPendingAutoResume(false);
                    pendingAutoResumeRef.current = false;

                    if (shouldResume) {
                      setShouldRestartAfterResponse(true);
                    }
                  };
                } catch (audioError) {
                  console.error('Audio playback error:', audioError);
                }
              }
              break;

            case 'error':
              console.error('WebSocket error:', data.message);
              setConnectionError(data.message);
              setTranscript(prev => [...prev, {
                speaker: 'System',
                text: `Error: ${data.message}`,
                timestamp: new Date()
              }]);
              
              // Handle authentication errors specifically
              if (data.message.includes('token') || data.message.includes('auth')) {
                setTranscript(prev => [...prev, {
                  speaker: 'System',
                  text: 'Authentication failed. Please log out and log back in.',
                  timestamp: new Date()
                }]);
              }
              break;

            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (parseError) {
          console.error('Message parse error:', parseError);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code);
        setIsConnected(false);
        setIsRecording(false);
        if (event.code !== 1000) {
          setConnectionError('Connection lost');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection failed');
        setIsConnected(false);
      };

      return true;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionError('Failed to connect');
      return false;
    }
  };

  // Start continuous voice conversation
  const startVoiceChat = async () => {
    if (!profile || isRecording || isProcessing) return;

    try {
      // First, connect to WebSocket if not already connected
      if (!isConnected) {
        const connected = await connectWebSocket();
        if (!connected) return;
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Create MediaRecorder for continuous audio streaming
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
          // Convert blob to base64 and send through WebSocket
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            websocketRef.current.send(JSON.stringify({
              type: 'audio_chunk',
              audio: base64
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording with small chunks for real-time streaming
      mediaRecorder.start(250); // Send data every 250ms
      setIsRecording(true);
      setIsProcessing(false);
      setPendingAutoResume(autoResumePreference);
      pendingAutoResumeRef.current = autoResumePreference;
      setHasStartedConversation(true);

      console.log('Continuous voice conversation started');

    } catch (error) {
      console.error('Error starting voice chat:', error);
      setIsRecording(false);
      setIsProcessing(false);
      setTranscript(prev => [...prev, {
        speaker: 'System',
        text: 'Failed to start voice recording. Please check your microphone permissions.',
        timestamp: new Date()
      }]);
    }
  };

  const stopVoiceChat = ({ autoResumeNext = true } = {}) => {
    if (!isRecording) return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setIsProcessing(autoResumeNext);
    const nextResume = autoResumeNext && autoResumePreference;
    setPendingAutoResume(nextResume);
    pendingAutoResumeRef.current = nextResume;

    if (!autoResumeNext) {
      setTranscript(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (!last || last.speaker !== 'System' || last.text !== 'Microphone paused. Tap the microphone to resume when you are ready.') {
          next.push({
            speaker: 'System',
            text: 'Microphone paused. Tap the microphone to resume when you are ready.',
            timestamp: new Date()
          });
        }
        return next;
      });
    }
  };

  // Cleanup WebSocket connection
  const disconnectWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
    setPendingAutoResume(false);
    pendingAutoResumeRef.current = false;
    setHasStartedConversation(false);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    pendingAutoResumeRef.current = pendingAutoResume;
  }, [pendingAutoResume]);

  useEffect(() => {
    if (!shouldRestartAfterResponse) return;
    setShouldRestartAfterResponse(false);

    if (
      websocketRef.current?.readyState === WebSocket.OPEN &&
      !isRecording &&
      !isProcessing
    ) {
      startVoiceChat();
    }
  }, [shouldRestartAfterResponse, isRecording, isProcessing]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleEndCall = () => {
    // Disconnect WebSocket and clean up
    disconnectWebSocket();

    const fallbackSlug = profile?.slug || slug;
    navigate(`/chat/${fallbackSlug}`);
  };

  const handleMicToggle = () => {
    if (connectionError && !isConnected) return;
    if (isProcessing && !isRecording) return;

    if (!isRecording) {
      startVoiceChat();
    } else {
      stopVoiceChat({ autoResumeNext: true });
    }
  };

  const handleManualPause = () => {
    if (!isRecording) return;
    stopVoiceChat({ autoResumeNext: false });
  };

  const toggleAutoResume = () => {
    setAutoResumePreference((prev) => {
      const next = !prev;
      if (!next) {
        setPendingAutoResume(false);
        pendingAutoResumeRef.current = false;
      } else if (!isRecording && hasStartedConversation) {
        setPendingAutoResume(true);
        pendingAutoResumeRef.current = true;
      }
      return next;
    });
  };

  const handleBack = () => {
    if (profile?.slug) {
      navigate(`/chat/${profile.slug}`);
    } else {
      navigate('/explore');
    }
  };

  const conversationMessages = useMemo(
    () => transcript.slice(-6),
    [transcript]
  );

  const statusTitle = useMemo(() => {
    if (connectionError && !isConnected) {
      return 'Connection lost';
    }
    if (!isConnected) {
      return 'Connecting';
    }
    if (isAssistantSpeaking) {
      return `${assistantFirstName} is speaking`;
    }
    if (isRecording) {
      return 'Listening';
    }
    if (isProcessing) {
      return 'Processing';
    }
    if (hasStartedConversation) {
      return 'Standing by';
    }
    return 'Ready to connect';
  }, [
    assistantFirstName,
    connectionError,
    hasStartedConversation,
    isAssistantSpeaking,
    isConnected,
    isProcessing,
    isRecording
  ]);

  const statusSubtitle = useMemo(() => {
    if (!isConnected) {
      return 'Establishing a secure channel';
    }
    if (isAssistantSpeaking) {
      return 'Playing the assistant\'s response';
    }
    if (isRecording) {
      return autoResumePreference
        ? 'Continuous conversation enabled'
        : 'Tap pause when you want to stop speaking';
    }
    if (isProcessing) {
      return 'Transcribing and analysing your voice';
    }
    if (hasStartedConversation) {
      return autoResumePreference ? 'Aura is ready for your next thought' : 'Tap the microphone to keep the call going';
    }
    return 'Tap the microphone to begin speaking';
  }, [
    autoResumePreference,
    hasStartedConversation,
    isAssistantSpeaking,
    isConnected,
    isProcessing,
    isRecording
  ]);

  const statusChipVariant = useMemo(() => {
    if (!isConnected) return 'disconnected';
    if (isAssistantSpeaking) return 'speaking';
    if (isRecording) return 'listening';
    if (isProcessing) return 'processing';
    return 'ready';
  }, [isAssistantSpeaking, isConnected, isProcessing, isRecording]);

  const micButtonDisabled = !isRecording && (!isConnected || isProcessing || isAssistantSpeaking);

  const micButtonLabel = useMemo(() => {
    if (isRecording) return 'Tap to pause';
    if (isAssistantSpeaking) return 'Assistant speaking';
    if (isProcessing) return 'Processing...';
    if (!hasStartedConversation) return 'Start conversation';
    return 'Tap to speak';
  }, [hasStartedConversation, isAssistantSpeaking, isProcessing, isRecording]);

  const controlHint = useMemo(() => {
    if (!isConnected) return 'We\'ll start listening as soon as the secure link is ready.';
    if (isAssistantSpeaking) return `${assistantFirstName} is finishing their thought.`;
    if (isRecording) return 'Speak naturally — Aura will keep the mic open until you pause.';
    if (isProcessing) return 'Hold on while Aura prepares a response.';
    if (hasStartedConversation) return 'Tap the microphone when you\'re ready to share more.';
    return 'Press the microphone to start the live call.';
  }, [
    assistantFirstName,
    hasStartedConversation,
    isAssistantSpeaking,
    isConnected,
    isProcessing,
    isRecording
  ]);

  const autoResumeLabel = autoResumePreference ? 'Auto-continue on' : 'Auto-continue off';
  const formattedDuration = formatDuration(elapsedSeconds);

  if (!profile) {
    return (
      <div className="voice-call-page">
        <div className="container">
          <div className="call-redirect-card">
            <h2>Call session unavailable</h2>
            <p>
              We couldn&apos;t load the assistant details for this call. Please return to the
              profile page and start the call again.
            </p>
            <button className="btn btn-primary" onClick={() => navigate(`/chat/${slug}`)}>
              Back to assistant profile
            </button>
          </div>
        </div>
        <style jsx>{`
          .voice-call-page {
            padding: var(--space-12) 0;
            min-height: calc(100vh - 80px);
            background: radial-gradient(circle at top, rgba(67, 97, 238, 0.08), transparent 65%),
              var(--gray-50);
          }

          .call-redirect-card {
            max-width: 560px;
            margin: 0 auto;
            background: var(--white);
            padding: var(--space-10);
            border-radius: var(--radius-2xl);
            text-align: center;
            box-shadow: var(--shadow-lg);
          }

          .call-redirect-card h2 {
            font-size: var(--text-2xl);
            font-weight: var(--font-weight-semibold);
            color: var(--gray-900);
            margin-bottom: var(--space-4);
          }

          .call-redirect-card p {
            color: var(--gray-600);
            margin-bottom: var(--space-6);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="voice-call-page">
      <div className="container">
        <div className="call-layout">
          <div className="call-stage">
            {connectionError && (
              <div className="call-banner" role="status">
                <span className="banner-dot" aria-hidden="true" />
                <p>{connectionError}</p>
              </div>
            )}
            <header className="call-header">
              <button
                type="button"
                className="back-button"
                onClick={handleBack}
                aria-label="Back to assistant profile"
              >
                ← Back
              </button>
              <div className="call-header-center">
                <span className={`status-chip ${statusChipVariant}`}>
                  <span className="chip-dot" aria-hidden="true" />
                  {statusTitle}
                </span>
                <p className="status-subtitle">{statusSubtitle}</p>
              </div>
              <button type="button" className="end-call-button" onClick={handleEndCall}>
                End Call
              </button>
            </header>

            <div className="call-body">
              <div
                className={`assistant-visual ${isRecording ? 'is-listening' : ''} ${
                  isAssistantSpeaking ? 'is-speaking' : ''
                }`}
                role="status"
                aria-live="polite"
              >
                <div className="assistant-orb">
                  <div className="orb-ring ring-1" aria-hidden="true" />
                  <div className="orb-ring ring-2" aria-hidden="true" />
                  <div className="orb-ring ring-3" aria-hidden="true" />
                  <div className="assistant-avatar">
                    {profile.avatarUrl && !avatarFailed ? (
                      <img
                        src={profile.avatarUrl}
                        alt={`${assistantName} avatar`}
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <span>{profile.avatar}</span>
                    )}
                  </div>
                  <div className="assistant-eq" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <div className="assistant-details">
                  <span className="call-timer-label">Call duration</span>
                  <span className="call-timer">{formattedDuration}</span>
                  <h1>{assistantName}</h1>
                  {profile.title && <p>{profile.title}</p>}
                </div>
              </div>

              <div className="conversation-feed">
                <div className="feed-header">
                  <div>
                    <p className="feed-title">Live conversation</p>
                    <p className="feed-status">{statusSubtitle}</p>
                  </div>
                  <div className={`feed-badge ${isConnected ? 'active' : ''}`}>
                    <span className="badge-dot" aria-hidden="true" />
                    <span>{isConnected ? 'On call' : 'Connecting'}</span>
                  </div>
                </div>
                <div className="feed-body">
                  {conversationMessages.length === 0 ? (
                    <div className="feed-placeholder">
                      <LoadingSpinner size="small" />
                      <p>Start speaking to see your dialogue unfold.</p>
                    </div>
                  ) : (
                    conversationMessages.map((line, index) => {
                      const role =
                        line.speaker === 'You'
                          ? 'user'
                          : line.speaker === assistantName
                          ? 'assistant'
                          : 'system';

                      return (
                        <div
                          key={`${line.speaker}-${index}`}
                          className={`conversation-bubble ${role}`}
                        >
                          <div className="bubble-meta">
                            <span className="bubble-speaker">
                              {line.speaker === assistantName ? assistantFirstName : line.speaker}
                            </span>
                            {line.timestamp && (
                              <span className="bubble-time">
                                {line.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p>{line.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <footer className="call-footer">
              <div className="call-controls">
                <button
                  type="button"
                  className={`mic-button ${isRecording ? 'active' : ''} ${isProcessing ? 'processing' : ''} ${
                    isAssistantSpeaking ? 'speaking' : ''
                  }`}
                  onClick={handleMicToggle}
                  disabled={micButtonDisabled}
                  aria-label={micButtonLabel}
                >
                  <span className="mic-icon" aria-hidden="true" />
                </button>
                <div className="control-panel">
                  <button
                    type="button"
                    className={`pill-button ${autoResumePreference ? 'active' : ''}`}
                    onClick={toggleAutoResume}
                  >
                    {autoResumeLabel}
                  </button>
                  <button
                    type="button"
                    className="pill-button subtle"
                    onClick={handleManualPause}
                    disabled={!isRecording}
                  >
                    Pause microphone
                  </button>
                </div>
                <button type="button" className="end-call-button" onClick={handleEndCall}>
                  End Call
                </button>
              </div>
              <p className="control-hint" role="status">{controlHint}</p>
            </footer>
          </div>

          <aside className="transcription-panel">
            <div className="transcription-header">
              <h2>Live transcript</h2>
              <span className="transcription-status">Capturing both sides in real time</span>
            </div>

            <div className="transcription-body" ref={transcriptRef}>
              {transcript.length === 0 && (
                <div className="transcription-placeholder">
                  <LoadingSpinner size="small" />
                  <p>Ready when you are. Tap the microphone to begin the conversation.</p>
                </div>
              )}

              {transcript.map((line, index) => (
                <div
                  key={`${line.speaker}-${index}`}
                  className={`transcription-line ${
                    line.speaker === 'You'
                      ? 'user-line'
                      : line.speaker === assistantName
                      ? 'assistant-line'
                      : 'system-line'
                  }`}
                >
                  <span className="speaker">{line.speaker}</span>
                  <span className="text">{line.text}</span>
                  {line.timestamp && (
                    <span className="timestamp">
                      {line.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}

              {isRecording && (
                <div className="transcription-line user-line recording">
                  <span className="speaker">You</span>
                  <span className="recording-indicator">
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              )}

              {isProcessing && (
                <div className="transcription-line assistant-line processing">
                  <span className="speaker">{assistantName}</span>
                  <span className="processing-indicator">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`

        .voice-call-page {
          padding: var(--space-12) 0;
          min-height: calc(100vh - 80px);
          background: radial-gradient(circle at top, rgba(67, 97, 238, 0.16), transparent 58%),
            linear-gradient(180deg, #f6f7ff 0%, #f9fafc 35%, #ffffff 100%);
        }

        .call-layout {
          display: grid;
          grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
          gap: var(--space-8);
          align-items: stretch;
        }

        .call-stage {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
          padding: var(--space-8);
          border-radius: 32px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(237, 242, 255, 0.96));
          box-shadow: 0 30px 60px rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(18px);
        }

        .call-banner {
          display: inline-flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-2xl);
          background: rgba(244, 63, 94, 0.12);
          color: var(--error-500);
          font-size: var(--text-sm);
          box-shadow: inset 0 0 0 1px rgba(244, 63, 94, 0.2);
        }

        .banner-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.2);
        }

        .call-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-4);
        }

        .back-button {
          border: none;
          background: rgba(67, 97, 238, 0.12);
          color: var(--primary-600);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          font-size: var(--text-sm);
          padding: var(--space-3) var(--space-4);
          border-radius: 999px;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }

        .back-button:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        .call-header-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          text-align: center;
        }

        .status-chip {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          border-radius: 999px;
          font-weight: var(--font-weight-semibold);
          font-size: var(--text-sm);
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .status-chip .chip-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: currentColor;
        }

        .status-chip.ready {
          background: rgba(15, 23, 42, 0.06);
          color: var(--gray-900);
        }

        .status-chip.listening {
          background: rgba(67, 97, 238, 0.16);
          color: var(--primary-600);
        }

        .status-chip.processing {
          background: rgba(251, 191, 36, 0.18);
          color: var(--warning-500);
        }

        .status-chip.speaking {
          background: rgba(16, 185, 129, 0.18);
          color: var(--success-500);
        }

        .status-chip.disconnected {
          background: rgba(148, 163, 184, 0.2);
          color: var(--gray-600);
        }

        .status-subtitle {
          color: var(--gray-600);
          font-size: var(--text-sm);
        }

        .call-body {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
          gap: var(--space-8);
          align-items: center;
        }

        .assistant-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-6);
          text-align: center;
        }

        .assistant-orb {
          position: relative;
          width: clamp(240px, 32vw, 360px);
          height: clamp(240px, 32vw, 360px);
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 30% 30%, rgba(67, 97, 238, 0.45), rgba(67, 97, 238, 0.1));
          box-shadow: inset 0 -20px 60px rgba(59, 130, 246, 0.25), 0 28px 60px rgba(67, 97, 238, 0.25);
          overflow: hidden;
        }

        .assistant-orb::after {
          content: '';
          position: absolute;
          inset: 12%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.4), transparent 70%);
          opacity: 0.6;
        }

        .assistant-visual.is-listening .orb-ring,
        .assistant-visual.is-speaking .orb-ring {
          opacity: 1;
          transform: scale(1);
        }

        .orb-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid rgba(67, 97, 238, 0.3);
          transform: scale(0.82);
          opacity: 0;
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .assistant-visual.is-listening .ring-1,
        .assistant-visual.is-speaking .ring-1 {
          animation: ripple 3s infinite;
        }

        .assistant-visual.is-listening .ring-2,
        .assistant-visual.is-speaking .ring-2 {
          animation: ripple 3s infinite 0.6s;
        }

        .assistant-visual.is-listening .ring-3,
        .assistant-visual.is-speaking .ring-3 {
          animation: ripple 3s infinite 1.2s;
        }

        .assistant-avatar {
          position: relative;
          width: clamp(140px, 20vw, 200px);
          height: clamp(140px, 20vw, 200px);
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: inset 0 0 0 4px rgba(67, 97, 238, 0.18);
          overflow: hidden;
          z-index: 1;
        }

        .assistant-avatar span {
          font-size: clamp(48px, 8vw, 72px);
          font-weight: var(--font-weight-semibold);
          color: var(--primary-600);
        }

        .assistant-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .assistant-eq {
          position: absolute;
          bottom: 18%;
          display: flex;
          gap: 6px;
          z-index: 1;
        }

        .assistant-eq span {
          width: 7px;
          height: 32px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          transform-origin: bottom center;
          animation: equalize 1.6s infinite ease-in-out;
          opacity: 0.6;
        }

        .assistant-visual:not(.is-speaking) .assistant-eq span {
          animation-play-state: paused;
          opacity: 0.3;
        }

        .assistant-eq span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .assistant-eq span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .assistant-eq span:nth-child(4) {
          animation-delay: 0.6s;
        }

        .assistant-eq span:nth-child(5) {
          animation-delay: 0.8s;
        }

        .assistant-details {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
        }

        .call-timer-label {
          font-size: var(--text-xs);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gray-500);
        }

        .call-timer {
          font-variant-numeric: tabular-nums;
          font-size: clamp(26px, 3vw, 36px);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
        }

        .assistant-details h1 {
          font-size: clamp(28px, 3vw, 40px);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
        }

        .assistant-details p {
          color: var(--gray-600);
          font-size: var(--text-sm);
        }

        .conversation-feed {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          padding: var(--space-6);
          border-radius: var(--radius-3xl);
          background: rgba(15, 23, 42, 0.92);
          color: var(--white);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.4);
          overflow: hidden;
        }

        .conversation-feed::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, rgba(59, 130, 246, 0.25), transparent 55%);
          pointer-events: none;
        }

        .feed-header,
        .feed-body {
          position: relative;
          z-index: 1;
        }

        .feed-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-4);
        }

        .feed-title {
          font-size: var(--text-lg);
          font-weight: var(--font-weight-semibold);
        }

        .feed-status {
          font-size: var(--text-sm);
          color: rgba(255, 255, 255, 0.68);
          margin-top: var(--space-1);
        }

        .feed-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .feed-badge.active {
          background: rgba(16, 185, 129, 0.2);
          color: var(--white);
        }

        .badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18);
        }

        .feed-body {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          max-height: 380px;
          overflow-y: auto;
          padding-right: var(--space-1);
        }

        .feed-body::-webkit-scrollbar {
          width: 6px;
        }

        .feed-body::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.16);
          border-radius: 999px;
        }

        .feed-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          color: rgba(255, 255, 255, 0.75);
          text-align: center;
        }

        .conversation-bubble {
          padding: var(--space-4);
          border-radius: var(--radius-2xl);
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          backdrop-filter: blur(4px);
        }

        .conversation-bubble.user {
          align-self: flex-end;
          background: rgba(96, 165, 250, 0.22);
        }

        .conversation-bubble.assistant {
          border: 1px solid rgba(148, 197, 255, 0.22);
        }

        .conversation-bubble.system {
          font-style: italic;
          color: rgba(255, 255, 255, 0.7);
          background: rgba(148, 163, 184, 0.2);
        }

        .bubble-meta {
          display: flex;
          justify-content: space-between;
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.6);
        }

        .bubble-speaker {
          font-weight: var(--font-weight-medium);
        }

        .bubble-time {
          font-variant-numeric: tabular-nums;
        }

        .conversation-bubble p {
          font-size: var(--text-base);
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.92);
        }

        .call-footer {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .call-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
          flex-wrap: wrap;
        }

        .mic-button {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          border: none;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, rgba(67, 97, 238, 0.95), rgba(88, 28, 135, 0.85));
          color: var(--white);
          box-shadow: 0 22px 45px rgba(59, 130, 246, 0.35);
          cursor: pointer;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast), filter var(--transition-fast);
        }

        .mic-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 28px 60px rgba(59, 130, 246, 0.45);
        }

        .mic-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
          box-shadow: none;
        }

        .mic-button.active {
          background: linear-gradient(145deg, rgba(16, 185, 129, 0.95), rgba(21, 128, 61, 0.85));
          box-shadow: 0 26px 52px rgba(16, 185, 129, 0.45);
        }

        .mic-button.processing {
          background: linear-gradient(145deg, rgba(251, 191, 36, 0.9), rgba(217, 119, 6, 0.85));
          box-shadow: 0 26px 52px rgba(217, 119, 6, 0.35);
        }

        .mic-button.speaking {
          background: linear-gradient(145deg, rgba(99, 102, 241, 0.95), rgba(14, 116, 144, 0.85));
        }

        .mic-icon {
          position: relative;
          width: 20px;
          height: 28px;
          background: var(--white);
          border-radius: 10px;
        }

        .mic-icon::before {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -8px;
          transform: translateX(-50%);
          width: 32px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.75);
          border-top: none;
          border-radius: 0 0 18px 18px;
        }

        .mic-icon::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -18px;
          transform: translateX(-50%);
          width: 4px;
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.75);
        }

        .control-panel {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
        }

        .pill-button {
          border: none;
          border-radius: 999px;
          padding: var(--space-2) var(--space-4);
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          background: rgba(67, 97, 238, 0.15);
          color: var(--primary-600);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
        }

        .pill-button.active {
          background: rgba(16, 185, 129, 0.18);
          color: var(--success-500);
          box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.35);
        }

        .pill-button.subtle {
          background: rgba(15, 23, 42, 0.08);
          color: var(--gray-700);
        }

        .pill-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .end-call-button {
          background: var(--error-500);
          color: var(--white);
          border: none;
          border-radius: 999px;
          padding: var(--space-3) var(--space-5);
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          box-shadow: 0 20px 40px rgba(239, 68, 68, 0.35);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }

        .end-call-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 24px 52px rgba(239, 68, 68, 0.45);
        }

        .control-hint {
          font-size: var(--text-sm);
          color: var(--gray-600);
        }

        .transcription-panel {
          background: rgba(15, 23, 42, 0.92);
          color: var(--white);
          border-radius: var(--radius-3xl);
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.45);
          position: relative;
          overflow: hidden;
        }

        .transcription-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.12), transparent 55%);
          pointer-events: none;
        }

        .transcription-header,
        .transcription-body {
          position: relative;
          z-index: 1;
        }

        .transcription-header h2 {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          margin-bottom: var(--space-2);
        }

        .transcription-status {
          font-size: var(--text-sm);
          color: rgba(255, 255, 255, 0.7);
        }

        .transcription-body {
          background: rgba(15, 23, 42, 0.75);
          border-radius: var(--radius-2xl);
          padding: var(--space-5);
          overflow-y: auto;
          max-height: 520px;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .transcription-body::-webkit-scrollbar {
          width: 6px;
        }

        .transcription-body::-webkit-scrollbar-thumb {
          background: rgba(148, 197, 255, 0.28);
          border-radius: 999px;
        }

        .transcription-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          color: rgba(255, 255, 255, 0.75);
          text-align: center;
        }

        .transcription-line {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .transcription-line .speaker {
          font-size: var(--text-xs);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
        }

        .transcription-line .text {
          font-size: var(--text-base);
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
        }

        .transcription-line.user-line .text {
          color: rgba(148, 197, 255, 0.92);
        }

        .transcription-line.system-line .text {
          color: rgba(255, 255, 255, 0.7);
          font-style: italic;
        }

        .timestamp {
          font-size: var(--text-xs);
          color: rgba(255, 255, 255, 0.4);
        }

        .recording-indicator,
        .processing-indicator {
          display: inline-flex;
          gap: 4px;
          align-items: center;
        }

        .recording-indicator span {
          width: 6px;
          height: 16px;
          border-radius: 999px;
          background: rgba(239, 68, 68, 0.85);
          animation: pulse-recording 1.1s infinite ease-in-out;
        }

        .recording-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .recording-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .recording-indicator span:nth-child(4) {
          animation-delay: 0.6s;
        }

        .processing-indicator span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(96, 165, 250, 0.85);
          animation: pulse-processing 1.2s infinite ease-in-out;
        }

        .processing-indicator span:nth-child(2) {
          animation-delay: 0.25s;
        }

        .processing-indicator span:nth-child(3) {
          animation-delay: 0.5s;
        }

        @keyframes ripple {
          0% {
            transform: scale(0.75);
            opacity: 0.9;
          }
          60% {
            opacity: 0;
          }
          100% {
            transform: scale(1.25);
            opacity: 0;
          }
        }

        @keyframes equalize {
          0%, 100% {
            transform: scaleY(0.45);
          }
          50% {
            transform: scaleY(1);
          }
        }

        @keyframes pulse-recording {
          0%, 100% {
            transform: scaleY(0.5);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }

        @keyframes pulse-processing {
          0%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          50% {
            transform: scale(1);
            opacity: 0.8;
          }
        }

        @media (max-width: 1200px) {
          .call-layout {
            grid-template-columns: 1fr;
          }

          .transcription-panel {
            order: -1;
          }

          .call-body {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .voice-call-page {
            padding: var(--space-8) 0;
          }

          .call-stage {
            padding: var(--space-6);
          }

          .call-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .control-panel {
            justify-content: space-between;
            width: 100%;
          }

          .end-call-button {
            width: 100%;
            text-align: center;
          }

          .conversation-feed {
            padding: var(--space-5);
          }

          .mic-button {
            width: 80px;
            height: 80px;
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceCallSession;
