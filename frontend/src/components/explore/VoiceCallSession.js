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
  const transcriptRef = useRef(null);
  const websocketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const { getToken } = useAuth();

  const assistantName = profile?.name || 'Aura Assistant';
  const assistantFirstName = useMemo(
    () => assistantName.split(' ')[0] || 'Aura',
    [assistantName]
  );

  const connectionLabel = useMemo(() => {
    if (isAssistantSpeaking) {
      return `${assistantFirstName} is speaking`;
    }
    if (isConnected) {
      return 'Live conversation';
    }
    if (connectionError) {
      return 'Connection error';
    }
    return 'Ready to connect';
  }, [assistantFirstName, connectionError, isAssistantSpeaking, isConnected]);

  const connectionTone = useMemo(() => {
    if (connectionError) {
      return 'error';
    }
    if (isAssistantSpeaking) {
      return 'speaking';
    }
    if (isConnected) {
      return 'connected';
    }
    return 'idle';
  }, [connectionError, isAssistantSpeaking, isConnected]);

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
      audioChunksRef.current = [];

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
      
      // Add user message to transcript
      setTranscript(prev => [...prev, {
        speaker: 'You',
        text: '🎤 Recording...',
        timestamp: new Date()
      }]);

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

  const stopVoiceChat = async () => {
    if (!isRecording) return;
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setIsProcessing(true);
  };

  // Cleanup WebSocket connection
  const disconnectWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
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

  const handleBack = () => {
    if (profile?.slug) {
      navigate(`/chat/${profile.slug}`);
    } else {
      navigate('/explore');
    }
  };

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
      <div className="call-shell">
        <section className="call-experience">
          <header className="experience-header">
            <button
              type="button"
              className="header-button back"
              onClick={handleBack}
              aria-label="Back to assistant profile"
            >
              <span aria-hidden="true">←</span>
              <span>Back</span>
            </button>
            <div className={`connection-pill ${connectionTone}`}>
              <span className="pill-indicator" aria-hidden="true" />
              <span className="pill-text">{connectionLabel}</span>
              <span className="pill-separator" aria-hidden="true">•</span>
              <span className="pill-time">{formatDuration(elapsedSeconds)}</span>
            </div>
            <button type="button" className="header-button end" onClick={handleEndCall}>
              End call
            </button>
          </header>

          <div className="experience-body" role="status" aria-live="polite">
            <div
              className={`avatar-orb ${isAssistantSpeaking ? 'speaking' : ''} ${
                isRecording ? 'recording' : ''
              }`}
            >
              <div className="orb-backdrop" aria-hidden="true" />
              <div className="avatar-inner">
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
              <div
                className={`voice-wave ${
                  isAssistantSpeaking || isRecording ? 'active' : ''
                }`}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="identity-block">
              <h1>{assistantName}</h1>
              {profile.title && <p>{profile.title}</p>}
            </div>

            <div className="call-state">
              <p className="state-title">{connectionLabel}</p>
              <p className="state-subtitle">
                {connectionError
                  ? connectionError
                  : isConnected
                  ? 'Your audio is streaming live to the assistant.'
                  : 'Tap start to begin a hands-free conversation.'}
              </p>
            </div>

            <div className="call-actions">
              {!isRecording ? (
                <button
                  type="button"
                  className="primary-action"
                  onClick={startVoiceChat}
                  disabled={isProcessing || connectionError}
                >
                  {isProcessing
                    ? 'Processing...'
                    : connectionError
                    ? 'Connection error'
                    : isConnected
                    ? 'Start talking'
                    : 'Connect & start'}
                </button>
              ) : (
                <button type="button" className="secondary-action" onClick={stopVoiceChat}>
                  Stop recording
                </button>
              )}
              <button type="button" className="ghost-action" onClick={handleEndCall}>
                End call
              </button>
            </div>
          </div>
        </section>

        <aside className="transcription-panel">
          <div className="transcription-header">
            <h2>Live transcript</h2>
            <span className="transcription-status">Capturing both sides in real time</span>
          </div>

          <div className="transcription-body" ref={transcriptRef}>
            {transcript.length === 0 && (
              <div className="transcription-placeholder">
                <LoadingSpinner size="small" />
                <p>Ready for voice conversation. Click "Start Voice Chat" to begin.</p>
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
                <div className="line-meta">
                  <span className="speaker">{line.speaker}</span>
                  {line.timestamp && (
                    <span className="timestamp">{line.timestamp.toLocaleTimeString()}</span>
                  )}
                </div>
                <div className="text">{line.text}</div>
              </div>
            ))}

            {isRecording && (
              <div className="transcription-line user-line recording">
                <div className="line-meta">
                  <span className="speaker">You</span>
                </div>
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
                <div className="line-meta">
                  <span className="speaker">{assistantName}</span>
                </div>
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

      <style jsx>{`
        .voice-call-page {
          min-height: calc(100vh - 80px);
          padding: var(--space-12) var(--space-6);
          background: radial-gradient(circle at top, rgba(67, 97, 238, 0.16), transparent 58%),
            linear-gradient(180deg, var(--gray-50), var(--gray-100));
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .call-shell {
          width: min(1180px, 100%);
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
          gap: var(--space-8);
          align-items: stretch;
        }

        .call-experience {
          position: relative;
          background: var(--white);
          border-radius: var(--radius-4xl);
          padding: var(--space-8);
          box-shadow: 0 28px 60px rgba(15, 23, 42, 0.18);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .call-experience::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(140deg, rgba(59, 130, 246, 0.08), transparent 55%),
            linear-gradient(320deg, rgba(14, 165, 233, 0.08), transparent 45%);
          pointer-events: none;
        }

        .experience-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }

        .header-button {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          border-radius: var(--radius-xl);
          padding: var(--space-2) var(--space-4);
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(248, 250, 252, 0.9);
          color: var(--gray-800);
          cursor: pointer;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
        }

        .header-button:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
          background: var(--white);
        }

        .header-button.end {
          background: rgba(248, 113, 113, 0.14);
          color: var(--error-600);
          border-color: rgba(248, 113, 113, 0.3);
        }

        .header-button.end:hover {
          background: var(--error-500);
          color: var(--white);
          box-shadow: 0 10px 25px rgba(248, 113, 113, 0.3);
        }

        .connection-pill {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          border-radius: 999px;
          padding: var(--space-2) var(--space-4);
          background: rgba(67, 97, 238, 0.12);
          color: var(--primary-600);
          font-weight: var(--font-weight-medium);
          box-shadow: inset 0 0 0 1px rgba(67, 97, 238, 0.2);
        }

        .connection-pill .pill-indicator {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: currentColor;
        }

        .connection-pill.speaking {
          background: rgba(34, 197, 94, 0.14);
          color: var(--success-600);
          box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.2);
        }

        .connection-pill.connected {
          background: rgba(59, 130, 246, 0.14);
          color: var(--primary-600);
        }

        .connection-pill.error {
          background: rgba(248, 113, 113, 0.16);
          color: var(--error-600);
          box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.24);
        }

        .connection-pill .pill-separator {
          opacity: 0.6;
        }

        .connection-pill .pill-time {
          font-variant-numeric: tabular-nums;
          font-size: var(--text-sm);
        }

        .experience-body {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--space-6);
          flex: 1;
        }

        .avatar-orb {
          position: relative;
          width: clamp(240px, 38vw, 360px);
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: radial-gradient(circle at 30% 30%, rgba(67, 97, 238, 0.45), rgba(59, 130, 246, 0.1));
          box-shadow: 0 30px 80px rgba(67, 97, 238, 0.25);
        }

        .avatar-orb.speaking::after,
        .avatar-orb.recording::after {
          content: '';
          position: absolute;
          inset: -18%;
          border-radius: 50%;
          border: 2px solid currentColor;
          opacity: 0.35;
          animation: breathe 2.8s infinite ease-in-out;
        }

        .avatar-orb.recording {
          color: var(--error-500);
        }

        .avatar-orb.speaking {
          color: var(--success-500);
        }

        .avatar-orb:not(.speaking):not(.recording) {
          color: var(--primary-500);
        }

        .orb-backdrop {
          position: absolute;
          inset: 8%;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(8px);
        }

        .avatar-inner {
          position: relative;
          width: 74%;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          overflow: hidden;
          background: var(--white);
          border: 6px solid rgba(255, 255, 255, 0.6);
          box-shadow: inset 0 4px 16px rgba(15, 23, 42, 0.08);
          display: grid;
          place-items: center;
        }

        .avatar-inner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-inner span {
          font-size: clamp(64px, 9vw, 96px);
        }

        .voice-wave {
          position: absolute;
          bottom: 18%;
          display: flex;
          gap: 6px;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .voice-wave.active {
          opacity: 1;
        }

        .voice-wave span {
          width: 6px;
          height: 28px;
          border-radius: 999px;
          background: currentColor;
          animation: wave 1.3s ease-in-out infinite;
        }

        .voice-wave span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .voice-wave span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .voice-wave span:nth-child(4) {
          animation-delay: 0.6s;
        }

        .identity-block h1 {
          font-size: clamp(28px, 3vw, 40px);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
        }

        .identity-block p {
          margin-top: var(--space-1);
          color: var(--gray-500);
          font-size: var(--text-base);
        }

        .call-state {
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .state-title {
          font-size: var(--text-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
        }

        .state-subtitle {
          color: var(--gray-600);
          line-height: 1.6;
        }

        .call-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          width: min(360px, 100%);
        }

        .call-actions button {
          width: 100%;
        }

        .primary-action,
        .secondary-action,
        .ghost-action {
          border-radius: var(--radius-2xl);
          padding: var(--space-3) var(--space-5);
          font-size: var(--text-base);
          font-weight: var(--font-weight-semibold);
          border: none;
          cursor: pointer;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
        }

        .primary-action {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: var(--white);
          box-shadow: 0 16px 30px rgba(67, 97, 238, 0.3);
        }

        .primary-action:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .primary-action:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 44px rgba(67, 97, 238, 0.35);
        }

        .secondary-action {
          background: rgba(248, 113, 113, 0.15);
          color: var(--error-600);
        }

        .secondary-action:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(248, 113, 113, 0.25);
        }

        .ghost-action {
          background: transparent;
          color: var(--gray-500);
          border: 1px dashed rgba(148, 163, 184, 0.4);
        }

        .ghost-action:hover {
          color: var(--gray-700);
          border-color: rgba(148, 163, 184, 0.6);
        }

        .transcription-panel {
          position: relative;
          background: rgba(15, 23, 42, 0.94);
          border-radius: var(--radius-4xl);
          padding: var(--space-7);
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          color: var(--white);
          box-shadow: 0 30px 60px rgba(15, 23, 42, 0.45);
          overflow: hidden;
        }

        .transcription-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.35), transparent 55%);
          opacity: 0.5;
          pointer-events: none;
        }

        .transcription-header {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .transcription-header h2 {
          font-size: clamp(20px, 2.2vw, 26px);
          font-weight: var(--font-weight-semibold);
        }

        .transcription-status {
          color: rgba(226, 232, 240, 0.7);
          font-size: var(--text-sm);
        }

        .transcription-body {
          position: relative;
          z-index: 1;
          background: rgba(15, 23, 42, 0.75);
          border-radius: var(--radius-3xl);
          padding: var(--space-5);
          overflow-y: auto;
          max-height: 520px;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .transcription-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          color: rgba(226, 232, 240, 0.75);
          text-align: center;
        }

        .transcription-line {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .transcription-line.user-line {
          align-items: flex-end;
        }

        .transcription-line.assistant-line,
        .transcription-line.system-line {
          align-items: flex-start;
        }

        .line-meta {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-xs);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(226, 232, 240, 0.55);
        }

        .transcription-line .text {
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-2xl);
          background: rgba(226, 232, 240, 0.08);
          color: rgba(248, 250, 252, 0.92);
          max-width: 100%;
          text-align: left;
          line-height: 1.6;
        }

        .transcription-line.user-line .text {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.2));
          color: var(--white);
        }

        .transcription-line.assistant-line .text {
          background: rgba(34, 197, 94, 0.18);
          color: rgba(240, 253, 244, 0.95);
        }

        .transcription-line.system-line .text {
          background: rgba(148, 163, 184, 0.16);
          color: rgba(226, 232, 240, 0.9);
          font-style: italic;
        }

        .timestamp {
          font-variant-numeric: tabular-nums;
          color: rgba(226, 232, 240, 0.5);
        }

        .recording-indicator,
        .processing-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-2xl);
          background: rgba(148, 163, 184, 0.14);
        }

        .recording-indicator span,
        .processing-indicator span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
        }

        .recording-indicator span {
          background: var(--error-400);
          animation: pulse-recording 0.9s infinite ease-in-out;
        }

        .processing-indicator span {
          background: var(--primary-400);
          animation: pulse-processing 1.2s infinite ease-in-out;
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

        .processing-indicator span:nth-child(2) {
          animation-delay: 0.3s;
        }

        .processing-indicator span:nth-child(3) {
          animation-delay: 0.6s;
        }

        @keyframes breathe {
          0%,
          100% {
            transform: scale(0.92);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.6;
          }
        }

        @keyframes wave {
          0%,
          100% {
            transform: scaleY(0.4);
          }
          50% {
            transform: scaleY(1);
          }
        }

        @keyframes pulse-recording {
          0%,
          100% {
            transform: scale(0.8);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes pulse-processing {
          0%,
          100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          50% {
            transform: scale(1);
            opacity: 0.8;
          }
        }

        @media (max-width: 1200px) {
          .call-shell {
            grid-template-columns: 1fr;
          }

          .transcription-panel {
            order: -1;
          }

          .experience-header {
            flex-wrap: wrap;
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .voice-call-page {
            padding: var(--space-8) var(--space-4);
          }

          .call-experience {
            padding: var(--space-6);
          }

          .experience-header {
            flex-direction: column;
            gap: var(--space-3);
          }

          .call-actions {
            width: 100%;
          }

          .transcription-panel {
            padding: var(--space-6);
          }
        }
      `}</style>
    </div>
  );

export default VoiceCallSession;
