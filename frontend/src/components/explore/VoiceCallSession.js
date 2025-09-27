// Aura Voice AI - Dedicated Voice Call Session
// ============================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.iaura.ai';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const transcriptRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recorderMimeTypeRef = useRef('audio/webm');
  const activeAudioRef = useRef(null);
  const skipProcessingRef = useRef(false);
  const isMutedRef = useRef(false);
  const { getToken } = useAuth();

  const assistantName = profile?.name || 'Aura Assistant';
  const assistantFirstName = useMemo(
    () => assistantName.split(' ')[0] || 'Aura',
    [assistantName]
  );

  const connectionLabel = useMemo(() => {
    if (connectionError) {
      return connectionError;
    }
    if (isAssistantSpeaking) {
      return `${assistantFirstName} is speaking`;
    }
    if (isRecording) {
      return 'Live conversation';
    }
    if (isProcessing) {
      return 'Processing audio…';
    }
    if (isConnected) {
      return 'Connected';
    }
    return 'Ready to connect';
  }, [assistantFirstName, connectionError, isAssistantSpeaking, isConnected, isProcessing, isRecording]);

  const connectionTone = useMemo(() => {
    if (connectionError) {
      return 'error';
    }
    if (isAssistantSpeaking) {
      return 'speaking';
    }
    if (isRecording) {
      return 'listening';
    }
    if (isProcessing) {
      return 'connected';
    }
    if (isConnected) {
      return 'connected';
    }
    return 'idle';
  }, [connectionError, isAssistantSpeaking, isConnected, isProcessing, isRecording]);

  useEffect(() => {
    if (!isConnected) {
      return undefined;
    }

    setElapsedSeconds(0);
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isConnected]);
  const checkBackendConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.status && !['healthy', 'ok'].includes(data.status)) {
          throw new Error('Voice service unavailable');
        }
        setConnectionError(null);
        return true;
      }

      throw new Error(`Health check failed (${response.status})`);
    } catch (primaryError) {
      try {
        const fallbackResponse = await fetch(`${API_BASE_URL}/voice/status`);
        if (fallbackResponse.ok) {
          const status = await fallbackResponse.json().catch(() => null);
          if (status?.status && ['healthy', 'operational'].includes(status.status)) {
            setConnectionError(null);
            return true;
          }
        }
      } catch (fallbackError) {
        console.debug('Fallback health check failed:', fallbackError);
      }

      console.error('Voice service connection error:', primaryError);
      setConnectionError('Unable to connect to the voice service. Please try again.');
      return false;
    }
  }, []);

  const determineFilename = (mimeType) => {
    if (!mimeType) {
      return 'audio.webm';
    }

    if (mimeType.includes('wav')) {
      return 'audio.wav';
    }

    if (mimeType.includes('ogg')) {
      return 'audio.ogg';
    }

    if (mimeType.includes('mp4')) {
      return 'audio.mp4';
    }

    return 'audio.webm';
  };

  const transcribeAudio = useCallback(
    async (audioBlob) => {
      const token = getToken && typeof getToken === 'function' ? getToken() : null;
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const formData = new FormData();
      const filename = determineFilename(audioBlob.type || recorderMimeTypeRef.current);
      formData.append('audio', audioBlob, filename);
      formData.append('language', 'en');

      const response = await fetch(`${API_BASE_URL}/voice/transcribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Transcription failed: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
      }

      const result = await response.json();
      return result.text || result.transcription || '';
    },
    [getToken]
  );

  const fetchAssistantReply = useCallback(
    async (message) => {
      const token = getToken && typeof getToken === 'function' ? getToken() : null;
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          user_id: profile?.id || 'anonymous',
          organization: 'default_org',
          use_memory: true,
          search_knowledge: true,
          slug: profile?.slug || slug,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`AI response failed: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
      }

      const result = await response.json();
      return result.response || '';
    },
    [getToken, profile, slug]
  );

  const synthesizeSpeech = useCallback(
    async (text) => {
      const token = getToken && typeof getToken === 'function' ? getToken() : null;
      if (!token || !text) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/voice/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${token}`,
        },
        body: new URLSearchParams({
          text: text.substring(0, 500),
          stability: '0.5',
          similarity_boost: '0.75',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Speech synthesis failed: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
      }

      const result = await response.json();
      return result?.audio || null;
    },
    [getToken]
  );

  const playAssistantAudio = useCallback(
    async (text) => {
      let audioUrl;
      try {
        const audioBase64 = await synthesizeSpeech(text);
        if (!audioBase64) {
          return;
        }

        const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
        const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        setIsAssistantSpeaking(true);

        await audio.play();

        audio.onended = () => {
          setIsAssistantSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }
        };
      } catch (error) {
        console.error('Audio playback error:', error);
        setIsAssistantSpeaking(false);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        activeAudioRef.current = null;
      }
    },
    [synthesizeSpeech]
  );

  const processRecording = useCallback(async () => {
    if (skipProcessingRef.current) {
      skipProcessingRef.current = false;
      audioChunksRef.current = [];
      setIsProcessing(false);
      return;
    }

    if (!audioChunksRef.current.length) {
      setIsProcessing(false);
      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'System',
          text: 'No speech detected. Tap “Start conversation” to try again.',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    try {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: recorderMimeTypeRef.current || 'audio/webm',
      });

      const transcription = await transcribeAudio(audioBlob);

      if (!transcription || !transcription.trim()) {
        setTranscript((prev) => [
          ...prev,
          {
            speaker: 'System',
            text: 'We couldn’t hear anything. Please try speaking again.',
            timestamp: new Date(),
          },
        ]);
        return;
      }

      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'You',
          text: transcription,
          timestamp: new Date(),
        },
      ]);

      const reply = await fetchAssistantReply(transcription);

      if (reply) {
        setTranscript((prev) => [
          ...prev,
          {
            speaker: assistantName,
            text: reply,
            timestamp: new Date(),
          },
        ]);

        await playAssistantAudio(reply);
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'System',
          text: error.message || 'Failed to process audio. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      audioChunksRef.current = [];
      setIsProcessing(false);
    }
  }, [assistantName, fetchAssistantReply, playAssistantAudio, transcribeAudio]);

  const startVoiceChat = useCallback(async () => {
    if (!profile || isRecording || isProcessing) {
      return;
    }

    const hasConnection = await checkBackendConnection();
    if (!hasConnection) {
      return;
    }

    try {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current = null;
      }
      setIsAssistantSpeaking(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const preferredMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];

      const mimeType = preferredMimeTypes.find(
        (type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
      );

      let mediaRecorder;
      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, {
              mimeType,
              audioBitsPerSecond: 128000,
            })
          : new MediaRecorder(stream);
      } catch (recorderError) {
        console.warn('Falling back to default MediaRecorder options:', recorderError);
        mediaRecorder = new MediaRecorder(stream);
      }

      recorderMimeTypeRef.current = mediaRecorder.mimeType || mimeType || 'audio/webm';
      mediaRecorderRef.current = mediaRecorder;
      streamRef.current = stream;
      audioChunksRef.current = [];
      skipProcessingRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setTranscript((prev) => [
          ...prev,
          {
            speaker: 'System',
            text: 'Microphone error detected. Please refresh and try again.',
            timestamp: new Date(),
          },
        ]);
        setIsRecording(false);
        setIsProcessing(false);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        processRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsProcessing(false);
      setIsConnected(true);
      setMuteState(false);

      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'System',
          text: '🎤 Listening… tap stop when you are done speaking.',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error starting voice chat:', error);
      setIsRecording(false);
      setIsProcessing(false);
      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'System',
          text: 'Failed to start voice recording. Please check your microphone permissions.',
          timestamp: new Date(),
        },
      ]);
    }
  }, [checkBackendConnection, isProcessing, isRecording, processRecording, profile]);

  const stopVoiceChat = useCallback(() => {
    if (!isRecording) {
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsRecording(false);
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'System',
          text: 'Processing your message…',
          timestamp: new Date(),
        },
      ]);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        skipProcessingRef.current = true;
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    checkBackendConnection();
  }, [checkBackendConnection]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const setMuteState = (muted) => {
    isMutedRef.current = muted;
    setIsMuted(muted);

    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  };

  const handlePrimaryControl = async () => {
    if (isProcessing) {
      return;
    }

    if (isRecording) {
      stopVoiceChat();
      return;
    }

    await startVoiceChat();
  };

  const primaryControlLabel = () => {
    if (isProcessing) {
      return 'Processing…';
    }

    if (isRecording) {
      return 'Stop & transcribe';
    }

    if (!isConnected || transcript.length === 0) {
      return 'Start conversation';
    }

    return 'Speak again';
  };

  const handleEndCall = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      skipProcessingRef.current = true;
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setIsProcessing(false);
    setIsConnected(false);
    setMuteState(false);

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
                <span className={`status-indicator ${connectionTone}`} aria-hidden="true" />
                <div>
                  <p className="status-title">{connectionLabel}</p>
                  <p className="status-time">{formatDuration(elapsedSeconds)}</p>
                </div>
              </div>
              <button type="button" className="end-call-button" onClick={handleEndCall}>
                End Call
              </button>
            </div>

            <div className="call-visualizer" role="status" aria-live="polite">
              <div
                className={`voice-circle ${
                  isAssistantSpeaking ? 'active' : ''
                } ${isRecording ? 'recording' : ''}`}
              >
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
                  onClick={handlePrimaryControl}
                  disabled={isProcessing}
                >
                  {primaryControlLabel()}
                </button>
                <button type="button" className="control-btn end" onClick={handleEndCall}>
                  End call
                </button>
              </div>
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
          box-shadow: 0 0 0 6px rgba(67, 97, 238, 0.12);
          background: var(--gray-400);
          animation: pulse-soft 1.6s infinite ease-in-out;
        }

        .status-indicator.speaking {
          background: var(--success-500);
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.2);
        }

        .status-indicator.listening,
        .status-indicator.connected {
          background: var(--primary-500);
          box-shadow: 0 0 0 6px rgba(67, 97, 238, 0.18);
        }

        .status-indicator.error {
          background: var(--error-500);
          box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.2);
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
          transition: box-shadow var(--transition-fast);
        }

        .voice-circle.recording {
          box-shadow: 0 30px 80px rgba(239, 68, 68, 0.25);
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

        .control-btn.muted {
          background: rgba(15, 23, 42, 0.08);
          color: var(--gray-800);
        }

        .control-btn.end {
          background: var(--error-500);
          color: var(--white);
        }

        .control-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .control-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
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

        .system-line .text {
          color: rgba(255, 255, 255, 0.7);
          font-style: italic;
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
