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
  const [isMuted, setIsMuted] = useState(false);
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
  const mediaStreamRef = useRef(null);
  const initializationRef = useRef(false);
  const { getToken, isAuthenticated } = useAuth();

  const assistantName = profile?.name || 'Aura Assistant';
  const assistantFirstName = useMemo(
    () => assistantName.split(' ')[0] || 'Aura',
    [assistantName]
  );

  const statusDetails = useMemo(() => {
    if (connectionError) {
      return {
        indicator: 'error',
        label: 'Connection issue',
        helper: connectionError,
      };
    }

    if (isAssistantSpeaking) {
      return {
        indicator: 'speaking',
        label: `${assistantFirstName} is speaking`,
        helper: 'Streaming response securely',
      };
    }

    if (isMuted) {
      return {
        indicator: 'muted',
        label: 'Microphone muted',
        helper: 'Tap to unmute and continue talking',
      };
    }

    if (isRecording) {
      return {
        indicator: 'listening',
        label: 'Listening to you',
        helper: 'Microphone is live',
      };
    }

    if (isProcessing) {
      return {
        indicator: 'listening',
        label: 'Connecting…',
        helper: 'Initializing secure voice channel',
      };
    }

    if (isConnected) {
      return {
        indicator: 'listening',
        label: 'Live conversation',
        helper: 'Secure channel active',
      };
    }

    return {
      indicator: 'disconnected',
      label: 'Preparing call',
      helper: 'Connecting to the assistant',
    };
  }, [
    assistantFirstName,
    connectionError,
    isAssistantSpeaking,
    isConnected,
    isMuted,
    isProcessing,
    isRecording,
  ]);

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

  useEffect(() => {
    if (!profile || initializationRef.current) {
      return;
    }

    if (!isAuthenticated) {
      setConnectionError('You need to be logged in to start a voice call.');
      return;
    }

    initializationRef.current = true;
    startVoiceChat();
  }, [isAuthenticated, profile]);

  // Simple WebSocket connection for voice conversation
  const connectWebSocket = async () => {
    const resolveToken = async () => {
      if (getToken && typeof getToken === 'function') {
        try {
          const possiblePromise = getToken();
          return possiblePromise instanceof Promise
            ? await possiblePromise
            : possiblePromise;
        } catch (tokenError) {
          console.error('Token retrieval error:', tokenError);
          return null;
        }
      }
      return null;
    };

    const rawToken = await resolveToken();
    if (!rawToken) {
      setConnectionError('Authentication required. Please log in.');
      return false;
    }

    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      return true;
    }

    try {
      // Ensure token is properly formatted
      const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
      const wsUrl = `wss://api.iaura.ai/ws/voice/continuous?token=${encodeURIComponent(token)}`;
      console.log('Connecting to WebSocket:', wsUrl);
      console.log('User token:', token ? 'Present' : 'Missing');
      const ws = new WebSocket(wsUrl);

      websocketRef.current = ws;

      return await new Promise((resolve) => {
        let hasResolved = false;
        const finalize = (value) => {
          if (!hasResolved) {
            hasResolved = true;
            resolve(value);
          }
        };

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setConnectionError(null);
          setTranscript((prev) => [
            ...prev,
            {
              speaker: 'System',
              text: 'Connected to AI assistant. You can start speaking.',
              timestamp: new Date(),
            },
          ]);
          finalize(true);
        };

        ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data.type);

          switch (data.type) {
            case 'user_transcript':
              setTranscript((prev) => [
                ...prev,
                {
                  speaker: 'You',
                  text: data.text,
                  timestamp: new Date(),
                },
              ]);
              break;

            case 'ai_audio':
              if (data.audio) {
                let audioUrl;
                try {
                  const audioBlob = new Blob(
                    [Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0))],
                    { type: 'audio/mpeg' }
                  );
                  audioUrl = URL.createObjectURL(audioBlob);
                  const audio = new Audio(audioUrl);

                  setIsAssistantSpeaking(true);
                  await audio.play();

                  setTranscript((prev) => [
                    ...prev,
                    {
                      speaker: assistantName,
                      text: data.text || 'AI responded',
                      timestamp: new Date(),
                    },
                  ]);

                  audio.onended = () => {
                    setIsAssistantSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                  };
                } catch (audioError) {
                  console.error('Audio playback error:', audioError);
                  setIsAssistantSpeaking(false);
                  if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                  }
                }
              }
              break;

            case 'error':
              console.error('WebSocket error:', data.message);
              setConnectionError(data.message);
              setTranscript((prev) => [
                ...prev,
                {
                  speaker: 'System',
                  text: `Error: ${data.message}`,
                  timestamp: new Date(),
                },
              ]);

              // Handle authentication errors specifically
              if (data.message.includes('token') || data.message.includes('auth')) {
                setTranscript((prev) => [
                  ...prev,
                  {
                    speaker: 'System',
                    text: 'Authentication failed. Please log out and log back in.',
                    timestamp: new Date(),
                  },
                ]);
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
          setIsAssistantSpeaking(false);
          stopVoiceChat();
          if (event.code !== 1000) {
            setConnectionError('Connection lost');
          }
          finalize(hasResolved ? true : false);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionError('Connection failed');
          setIsConnected(false);
          finalize(false);
        };
      });
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
      setIsProcessing(true);
      setConnectionError(null);

      // First, connect to WebSocket if not already connected
      if (!isConnected) {
        const connected = await connectWebSocket();
        if (!connected) {
          setIsProcessing(false);
          return;
        }
      }

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setConnectionError('Microphone not available in this environment.');
        setIsProcessing(false);
        return;
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Create MediaRecorder for continuous audio streaming
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
          // Convert blob to base64 and send through WebSocket
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            websocketRef.current.send(
              JSON.stringify({
                type: 'audio_chunk',
                audio: base64,
              })
            );
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording with small chunks for real-time streaming
      mediaRecorder.start(250); // Send data every 250ms
      setIsRecording(true);
      setIsProcessing(false);
      setIsMuted(false);

      console.log('Continuous voice conversation started');
    } catch (error) {
      console.error('Error starting voice chat:', error);
      setIsRecording(false);
      setIsProcessing(false);
      setConnectionError(
        'Failed to start voice recording. Please check your microphone permissions.'
      );
      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'System',
          text: 'Failed to start voice recording. Please check your microphone permissions.',
          timestamp: new Date(),
        },
      ]);
    }
  };

  const stopVoiceChat = () => {
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (recorderError) {
        console.error('Error stopping media recorder:', recorderError);
      }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (!mediaRecorderRef.current || !isRecording) {
      return;
    }

    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    try {
      if (mediaRecorderRef.current.state === 'recording' && nextMuted && mediaRecorderRef.current.pause) {
        mediaRecorderRef.current.pause();
      } else if (mediaRecorderRef.current.state === 'paused' && !nextMuted && mediaRecorderRef.current.resume) {
        mediaRecorderRef.current.resume();
      }
    } catch (recorderError) {
      console.error('MediaRecorder mute toggle error:', recorderError);
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          type: 'microphone_status',
          muted: nextMuted,
        })
      );
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
    setIsAssistantSpeaking(false);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopVoiceChat();
      disconnectWebSocket();
    };
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleEndCall = () => {
    // Disconnect WebSocket and clean up
    stopVoiceChat();
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
      <div className="container">
        <div className="call-layout">
          <div className="call-stage">
            <div className="call-header">
              <button
                type="button"
                className="back-button"
                onClick={handleBack}
                aria-label="Back to assistant profile"
              >
                ← Back
              </button>
              <div className="call-status">
                <span
                  className={`status-indicator ${statusDetails.indicator}`}
                  aria-hidden="true"
                />
                <div>
                  <p className="status-title">{statusDetails.label}</p>
                  <p className="status-time">{formatDuration(elapsedSeconds)}</p>
                  {statusDetails.helper && (
                    <p className="status-helper">{statusDetails.helper}</p>
                  )}
                </div>
              </div>
              <button type="button" className="end-call-button" onClick={handleEndCall}>
                End Call
              </button>
            </div>

            <div className="call-visualizer" role="status" aria-live="polite">
              <div className={`voice-circle ${isAssistantSpeaking ? 'active' : ''}`}>
                <div className="pulse-ring ring-1" aria-hidden="true" />
                <div className="pulse-ring ring-2" aria-hidden="true" />
                <div className="pulse-ring ring-3" aria-hidden="true" />
                <div className="avatar-shell">
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
                <div className="equalizer" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className="assistant-meta">
                <h1>{assistantName}</h1>
                {profile.title && <p>{profile.title}</p>}
              </div>

              <div className="call-controls">
                <button
                  type="button"
                  className={`control-btn ${isMuted ? 'muted' : ''}`}
                  onClick={toggleMute}
                  disabled={!isRecording || Boolean(connectionError)}
                >
                  {isMuted ? 'Unmute microphone' : 'Mute microphone'}
                </button>
                <button type="button" className="control-btn end" onClick={handleEndCall}>
                  End call
                </button>
              </div>

              {connectionError && (
                <div className="call-alert">
                  <p>{connectionError}</p>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setConnectionError(null);
                      startVoiceChat();
                    }}
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
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
                  <p>Initializing secure voice channel…</p>
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
                </div>
              ))}

              {isAssistantSpeaking && (
                <div className="transcription-line assistant-line listening">
                  <span className="speaker">{assistantName}</span>
                  <span className="listening-indicator">
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
          background: radial-gradient(circle at top, rgba(67, 97, 238, 0.1), transparent 55%),
            var(--gray-50);
        }

        .call-layout {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          gap: var(--space-8);
        }

        .call-stage {
          background: rgba(255, 255, 255, 0.92);
          border-radius: var(--radius-3xl);
          padding: var(--space-8);
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .call-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-10);
          gap: var(--space-4);
        }

        .back-button {
          border: none;
          background: transparent;
          color: var(--primary-600);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          font-size: var(--text-base);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-lg);
          transition: background var(--transition-fast);
        }

        .back-button:hover {
          background: rgba(67, 97, 238, 0.08);
        }

        .call-status {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .status-indicator {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--primary-500);
          box-shadow: 0 0 0 6px rgba(67, 97, 238, 0.18);
          animation: pulse-soft 1.6s infinite ease-in-out;
        }

        .status-indicator.speaking {
          background: var(--success-500);
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.2);
        }

        .status-indicator.listening {
          background: var(--primary-500);
        }

        .status-indicator.muted {
          background: var(--warning-500);
          box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.18);
          animation: none;
        }

        .status-indicator.error {
          background: var(--error-500);
          box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.18);
          animation: none;
        }

        .status-indicator.disconnected {
          background: var(--gray-400);
          box-shadow: 0 0 0 6px rgba(156, 163, 175, 0.18);
          animation: none;
        }

        .status-title {
          font-size: var(--text-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
        }

        .status-time {
          color: var(--gray-600);
          font-size: var(--text-sm);
        }

        .status-helper {
          font-size: var(--text-xs);
          color: var(--gray-500);
          margin-top: 2px;
        }

        .end-call-button {
          background: var(--error-500);
          color: var(--white);
          border: none;
          border-radius: var(--radius-lg);
          padding: var(--space-3) var(--space-4);
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }

        .end-call-button:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .call-visualizer {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--space-8);
        }

        .voice-circle {
          position: relative;
          width: clamp(240px, 35vw, 360px);
          height: clamp(240px, 35vw, 360px);
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, rgba(67, 97, 238, 0.35), rgba(63, 55, 201, 0.15));
          overflow: hidden;
        }

        .voice-circle.active .pulse-ring {
          opacity: 1;
          transform: scale(1);
        }

        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid rgba(67, 97, 238, 0.45);
          opacity: 0;
          transform: scale(0.85);
          transition: transform 0.8s ease, opacity 0.8s ease;
        }

        .voice-circle.active .ring-1 {
          animation: ripple 2.4s infinite;
        }

        .voice-circle.active .ring-2 {
          animation: ripple 2.4s infinite 0.4s;
        }

        .voice-circle.active .ring-3 {
          animation: ripple 2.4s infinite 0.8s;
        }

        .avatar-shell {
          position: relative;
          width: clamp(140px, 20vw, 200px);
          height: clamp(140px, 20vw, 200px);
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: var(--white);
          box-shadow: inset 0 0 0 4px rgba(67, 97, 238, 0.15);
          overflow: hidden;
        }

        .avatar-shell span {
          font-size: clamp(48px, 7vw, 72px);
          font-weight: var(--font-weight-semibold);
          color: var(--primary-500);
        }

        .avatar-shell img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .equalizer {
          position: absolute;
          bottom: 30px;
          display: flex;
          gap: 6px;
        }

        .equalizer span {
          width: 6px;
          height: 32px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.8);
          animation: equalize 1.3s infinite ease-in-out;
        }

        .voice-circle:not(.active) .equalizer span {
          animation-play-state: paused;
          opacity: 0.35;
        }

        .equalizer span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .equalizer span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .equalizer span:nth-child(4) {
          animation-delay: 0.6s;
        }

        .equalizer span:nth-child(5) {
          animation-delay: 0.8s;
        }

        .assistant-meta h1 {
          font-size: clamp(28px, 3vw, 40px);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
        }

        .assistant-meta p {
          color: var(--gray-600);
          margin-top: var(--space-2);
        }

        .call-controls {
          display: flex;
          gap: var(--space-4);
          align-items: center;
          flex-wrap: wrap;
        }

        .control-btn {
          border: none;
          border-radius: var(--radius-xl);
          padding: var(--space-3) var(--space-6);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          background: rgba(67, 97, 238, 0.12);
          color: var(--primary-600);
        }

        .control-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .control-btn.muted {
          background: rgba(15, 23, 42, 0.08);
          color: var(--gray-800);
        }

        .control-btn.end {
          background: var(--error-500);
          color: var(--white);
        }

        .control-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        .call-alert {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          background: rgba(239, 68, 68, 0.08);
          border-radius: var(--radius-xl);
          padding: var(--space-4);
          margin-top: var(--space-4);
          color: var(--error-600);
          text-align: center;
          max-width: 420px;
        }

        .call-alert button {
          align-self: center;
          border: none;
          background: var(--error-500);
          color: var(--white);
          border-radius: var(--radius-lg);
          padding: var(--space-2) var(--space-4);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
        }

        .call-alert button:hover {
          opacity: 0.9;
        }

        .call-alert button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .transcription-panel {
          background: rgba(15, 23, 42, 0.9);
          color: var(--white);
          border-radius: var(--radius-3xl);
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          box-shadow: var(--shadow-xl);
          position: relative;
          overflow: hidden;
        }

        .transcription-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, rgba(59, 130, 246, 0.15), transparent 45%);
          pointer-events: none;
        }

        .transcription-header {
          position: relative;
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
          position: relative;
          background: rgba(15, 23, 42, 0.75);
          border-radius: var(--radius-2xl);
          padding: var(--space-5);
          overflow-y: auto;
          max-height: 480px;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .transcription-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          color: rgba(255, 255, 255, 0.75);
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

        .user-line .text {
          color: rgba(148, 197, 255, 0.92);
        }

        .transcription-line.listening .speaker {
          color: rgba(148, 197, 255, 0.85);
        }

        .listening-indicator {
          display: inline-flex;
          gap: 6px;
          align-items: center;
        }

        .listening-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(148, 197, 255, 0.85);
          animation: bounce 0.9s infinite ease-in-out;
        }

        .listening-indicator span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .listening-indicator span:nth-child(3) {
          animation-delay: 0.3s;
        }

        .system-line .text {
          color: rgba(255, 255, 255, 0.7);
          font-style: italic;
        }

        @keyframes ripple {
          0% {
            transform: scale(0.75);
            opacity: 0.75;
          }
          70% {
            opacity: 0;
          }
          100% {
            transform: scale(1.25);
            opacity: 0;
          }
        }

        @keyframes equalize {
          0%,
          100% {
            transform: scaleY(0.45);
          }
          50% {
            transform: scaleY(1);
          }
        }

        @keyframes pulse-soft {
          0%,
          100% {
            transform: scale(0.9);
            opacity: 0.75;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }

        @media (max-width: 1200px) {
          .call-layout {
            grid-template-columns: 1fr;
          }

          .transcription-panel {
            order: -1;
          }
        }

        @media (max-width: 768px) {
          .voice-call-page {
            padding: var(--space-8) 0;
          }

          .call-stage {
            padding: var(--space-6);
          }

          .call-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-4);
          }

          .call-visualizer {
            gap: var(--space-6);
          }

          .call-controls {
            flex-direction: column;
            width: 100%;
          }

          .control-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceCallSession;
