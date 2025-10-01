import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Production-Ready Voice Chat Component with Original VoiceCallSession UI
 * Uses direct HTTP endpoints with original beautiful interface
 */
const ProductionVoiceChat = () => {
  const { user, getToken } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [processingTimeout, setProcessingTimeout] = useState(null);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ⚠️ CRITICAL FIX: DO NOT MODIFY THIS USEEFFECT ⚠️
  // This checks backend connection on mount and prevents React Hooks errors
  // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
  useEffect(() => {
    checkBackendConnection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [processingTimeout]);

  // Timer effect for call duration
  useEffect(() => {
    let timer;
    if (isConnected) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isConnected]);

  // ⚠️ CRITICAL FIX: DO NOT MODIFY HEALTH CHECK ENDPOINTS ⚠️
  // These exact endpoints ensure proper backend connectivity validation
  // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
  const checkBackendConnection = async () => {
    try {
      // REQUIRED: Primary health check endpoint
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://api.iaura.ai'}/health`);
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.status === 'healthy');
        console.log('✅ Backend health check:', data);
      }
    } catch (err) {
      console.error('Backend connection check failed:', err);
      console.log('🔄 Retrying with different endpoints...');
      
      // REQUIRED: Fallback endpoint for voice service health
      try {
        const altResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://api.iaura.ai'}/voice/status`);
        if (altResponse.ok) {
          const altData = await altResponse.json();
          setIsConnected(altData.status === 'operational');
          console.log('✅ Backend voice status check:', altData);
          return;
        }
      } catch (altErr) {
        console.error('Alternative endpoint check failed:', altErr);
      }
      
      setIsConnected(false); // CRITICAL: Set false if all checks fail
    }
  };

  // Format duration like original
  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleEndCall = () => {
    clearTranscript();
    handleBack();
  };

  const clearTranscript = () => {
    setTranscript([]);
    setError(null);
  };

  // All the voice processing functions remain the same...
  const startRecording = async () => {
    try {
      setError(null);
      
      // Check if user is authenticated
      const token = getToken();
      if (!token) {
        setError('Please log in to use voice chat.');
        return;
      }

      // ⚠️ CRITICAL FIX: DO NOT MODIFY THESE CONSTRAINTS ⚠️
      // These exact settings fix the "you" transcription issue
      // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
      const constraints = {
        audio: {
          sampleRate: 16000,        // REQUIRED: Matches backend expectation
          channelCount: 1,          // REQUIRED: Mono audio only
          echoCancellation: false,  // REQUIRED: Prevents audio processing issues  
          noiseSuppression: false,  // REQUIRED: Keeps natural voice
          autoGainControl: false    // REQUIRED: Consistent audio levels
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('🎤 Microphone access granted');
      
      // Create audio context for monitoring levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const microphone = source;
      
      microphone.connect(analyser);
      
      // Monitor audio levels like demo.py/bic.py
      let audioLevels = [];
      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        audioLevels.push(average);
        
        // Keep last 10 samples for level calculation
        if (audioLevels.length > 10) {
          audioLevels.shift();
        }
        
        const maxLevel = Math.max(...audioLevels);
        console.log('🎤 Audio level:', average.toFixed(2), 'Max:', maxLevel.toFixed(2));
        
        if (isRecording) {
          requestAnimationFrame(checkAudioLevel);
        }
      };
      checkAudioLevel();
      
      // Create MediaRecorder with better format detection and options
      let mediaRecorder;
      let mimeType = 'audio/webm;codecs=opus'; // Default fallback
      
      // ⚠️ CRITICAL FIX: DO NOT MODIFY MIME TYPE PRIORITY ⚠️
      // This order prioritizes formats that work best with backend transcription
      // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
      const supportedFormats = [
        'audio/webm;codecs=opus', // REQUIRED: Primary format for compatibility
        'audio/webm',             // REQUIRED: Fallback webm
        'audio/mp4',              // REQUIRED: Alternative format
        'audio/ogg;codecs=opus',  // REQUIRED: Opus codec fallback
        'audio/wav'               // REQUIRED: Last resort (larger files)
      ];
      
      for (const format of supportedFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          break;
        }
      }
      
      console.log('🎤 Supported formats:', supportedFormats.filter(f => MediaRecorder.isTypeSupported(f)));
      console.log('🎤 Using format:', mimeType);
      
      // Create MediaRecorder with additional options for better quality
      const options = {
        mimeType: mimeType,
        audioBitsPerSecond: 128000, // Higher bitrate for better quality
      };
      
      try {
        mediaRecorder = new MediaRecorder(stream, options);
        console.log('✅ MediaRecorder created successfully');
      } catch (error) {
        console.warn('⚠️ Failed to create MediaRecorder with options, trying basic:', error);
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('🎤 Audio chunk received, size:', event.data.size, 'total chunks:', audioChunksRef.current.length);
        } else {
          console.warn('⚠️ Empty audio chunk received');
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        setError('Recording error: ' + event.error);
        setIsRecording(false);
      };
      
      mediaRecorder.onstop = () => {
        console.log('🛑 MediaRecorder stopped, chunks collected:', audioChunksRef.current.length);
        processAudio();
      };
      
      mediaRecorder.start(1000); // Start with 1-second intervals for better chunk collection
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      
      console.log('🎤 Recording started at:', new Date().toLocaleTimeString());
      
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const recordingDuration = recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : 0;
      console.log('🛑 Stopping recording after', recordingDuration.toFixed(1), 'seconds');
      
      // ⚠️ CRITICAL FIX: DO NOT MODIFY MINIMUM DURATION ⚠️
      // This prevents processing of very short recordings that cause "you" transcriptions
      // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
      if (recordingDuration < 0.5) { // REQUIRED: Minimum 0.5 seconds
        console.warn('⚠️ Recording too short, please speak for at least 0.5 seconds');
        setError('Recording too short. Please speak for at least half a second.');
        setIsRecording(false);
        return;
      }
      
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingStartTime(null);
    }
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('❌ No audio chunks to process');
      setError('No audio recorded. Please try speaking louder.');
      return;
    }
    
    // Calculate total audio size for quality check
    const totalAudioSize = audioChunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
    console.log('🎵 Total audio size:', totalAudioSize, 'bytes, chunks:', audioChunksRef.current.length);
    
    // ⚠️ CRITICAL FIX: DO NOT MODIFY AUDIO SIZE VALIDATION ⚠️
    // This prevents processing of silent/corrupted audio that causes "you" transcriptions
    // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
    if (totalAudioSize < 1000) { // REQUIRED: Less than 1KB is likely too small
      console.warn('❌ Audio file too small, likely no meaningful speech:', totalAudioSize, 'bytes');
      setError('Recording too short or quiet. Please speak louder and longer.');
      return;
    }
    
    console.log('🔄 Processing audio, chunks:', audioChunksRef.current.length);
    setIsProcessing(true);
    
    // ⚠️ CRITICAL FIX: DO NOT MODIFY TIMEOUT VALUE ⚠️
    // This 30-second timeout prevents infinite processing loops
    // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
    const timeout = setTimeout(() => {
      console.log('⏰ Processing timeout reached');
      setError('Processing timeout. Please try again.');
      setIsProcessing(false);
    }, 30000); // REQUIRED: 30 second timeout for complete AI pipeline (transcription + AI + TTS)
    
    setProcessingTimeout(timeout);
    
    try {
      
      // ⚠️ CRITICAL FIX: DO NOT MODIFY MIME TYPE HANDLING ⚠️
      // Using mediaRecorderRef.current.mimeType ensures backend receives correct format info
      // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
      const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm'; // REQUIRED: Use actual recorder type
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      console.log('Audio blob created, size:', audioBlob.size, 'bytes', 'type:', mimeType);
      
      // Transcribe audio using direct endpoint
      console.log('🎯 Sending audio for transcription...');
      const transcription = await transcribeAudio(audioBlob);
      console.log('📝 Transcription result:', transcription);
      
      if (transcription && transcription.trim() && transcription.length > 2) {
        console.log('✅ Valid transcription received:', transcription);
        
        // ⚠️ CRITICAL FIX: DO NOT MODIFY TRANSCRIPTION VALIDATION ⚠️
        // This prevents "you" transcriptions and AI loops from short/unclear audio
        // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
        if (transcription.length < 5 || transcription.toLowerCase().trim() === 'you') { // REQUIRED: Minimum 5 chars, reject "you"
          console.warn('❌ Rejecting very short/invalid transcription to prevent loop:', transcription);
          setError('Audio unclear. Please speak louder and longer.');
          return; // CRITICAL: Exit early to prevent AI response
        }
        
        
        // Add user transcript
        setTranscript(prev => [...prev, {
          speaker: 'You',
          text: transcription,
          timestamp: new Date()
        }]);
        
        // Get AI response
        console.log('🤖 Getting AI response...');
        const response = await getAIResponse(transcription);
        
        if (response && response.trim()) {
          console.log('✅ AI response received:', response);
          
          // CRITICAL: Check for repeated responses and conversation loops
          const recentAIResponses = transcript.filter(entry => entry.speaker === 'AI Assistant').slice(-3); // Last 3 AI responses
          const isRepeatedResponse = recentAIResponses.some(entry => entry.text === response);
          const recentUserMessages = transcript.filter(entry => entry.speaker === 'You').slice(-3); // Last 3 user messages
          const isRepeatedUserMessage = recentUserMessages.filter(entry => entry.text === transcription).length > 1;
          
          if (isRepeatedResponse || isRepeatedUserMessage) {
            console.log('🚨 CIRCUIT BREAKER: Detected conversation loop, stopping to prevent infinite responses');
            console.log('Repeated AI response:', isRepeatedResponse, 'Repeated user message:', isRepeatedUserMessage);
            setError('Conversation loop detected. Please start a new conversation or try a different question.');
            setIsProcessing(false); // Force stop processing
            return;
          }
          
          // Add AI transcript
          setTranscript(prev => [...prev, {
            speaker: 'AI Assistant',
            text: response,
            timestamp: new Date()
          }]);
          
          
          // Synthesize speech
          console.log('🔊 Synthesizing speech...');
          await synthesizeSpeech(response);
        } else {
          console.log('❌ No AI response received');
          setError('AI did not respond. Please try again.');
        }
      } else {
        console.log('❌ Invalid transcription:', transcription);
        setError('No clear speech detected. Please speak clearly and try again.');
      }
      
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process audio. Please try again.');
    } finally {
      // Clear timeout
      if (processingTimeout) {
        clearTimeout(processingTimeout);
        setProcessingTimeout(null);
      }
      setIsProcessing(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    console.log('Sending audio for transcription, size:', audioBlob.size, 'type:', audioBlob.type);
    const formData = new FormData();
    
    // ⚠️ CRITICAL FIX: DO NOT MODIFY AUDIO FORMAT DETECTION ⚠️
    // This ensures backend receives correct file extension and format info
    // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
    let filename = 'audio.webm';     // REQUIRED: Default fallback
    let audioFormat = 'webm';        // REQUIRED: Default format
    
    if (audioBlob.type.includes('wav')) {
      filename = 'audio.wav';        // REQUIRED: WAV extension
      audioFormat = 'wav';           // REQUIRED: WAV format
    } else if (audioBlob.type.includes('ogg')) {
      filename = 'audio.ogg';        // REQUIRED: OGG extension
      audioFormat = 'ogg';           // REQUIRED: OGG format
    } else if (audioBlob.type.includes('mp4')) {
      filename = 'audio.mp4';        // REQUIRED: MP4 extension
      audioFormat = 'mp4';           // REQUIRED: MP4 format
    }
    
    console.log('🎵 Audio format detected:', audioFormat, 'MIME type:', audioBlob.type);
    
    formData.append('audio', audioBlob, filename);
    formData.append('language', 'en');
    
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://api.iaura.ai'}/voice/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Transcription failed:', response.status, errorText);
      throw new Error(`Transcription failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    return result.text || result.transcription;
  };

  const getAIResponse = async (message) => {
    // Get dynamic assistant key from user metadata
    const assistantKeyCandidates = [
      user?.user_metadata?.assistant_key,
      user?.user_metadata?.assistantKey,
      user?.user_metadata?.slug,
      user?.user_metadata?.profile_slug,
      user?.user_metadata?.persona_slug,
      user?.user_metadata?.username,
    ]
      .map((value) => (value ? value.toString().trim() : ''))
      .filter(Boolean);
    const assistantKey = assistantKeyCandidates[0] || 'default';
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://api.iaura.ai'}/rag/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        message: message,
        assistant_key: assistantKey,
        user_id: user?.id || 'anonymous',
        use_memory: true,
        search_knowledge: true,
        organization: 'default_org'
      })
    });
    
    if (!response.ok) {
      throw new Error(`AI response failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.response;
  };

  const synthesizeSpeech = async (text) => {
    console.log('🔊 Synthesizing speech for:', text.substring(0, 100) + '...');

    // ⚠️ CRITICAL FIX: DO NOT MODIFY REQUEST FORMAT ⚠️
    // Backend expects URL-encoded format, NOT JSON - changing this causes 422 errors
    // See VOICE_FIXES_DOCUMENTATION.md for detailed explanation
    const voicePreference =
      user?.voice_preference ||
      user?.voicePreference ||
      user?.user_metadata?.voice_preference ||
      user?.user_metadata?.voicePreference ||
      null;
    const voiceId =
      (typeof voicePreference === 'string' ? voicePreference : null) ||
      voicePreference?.voice_id ||
      voicePreference?.voiceId ||
      voicePreference?.params?.voice_id ||
      voicePreference?.params?.voiceId ||
      null;

    const assistantKeyCandidates = [
      user?.user_metadata?.assistant_key,
      user?.user_metadata?.assistantKey,
      user?.user_metadata?.slug,
      user?.user_metadata?.profile_slug,
      user?.user_metadata?.persona_slug,
      user?.user_metadata?.username,
    ]
      .map((value) => (value ? value.toString().trim() : ''))
      .filter(Boolean);
    const assistantKey = assistantKeyCandidates[0] || '';

    const tenantIdRaw =
      user?.user_metadata?.tenant_id ||
      user?.app_metadata?.tenant_id ||
      user?.tenant_id ||
      '';
    const tenantId = tenantIdRaw ? tenantIdRaw.toString().trim() : '';

    const params = new URLSearchParams({
      text: text.substring(0, 500), // REQUIRED: Text length limit
      stability: '0.5',
      similarity_boost: '0.75'
    });

    if (assistantKey) {
      params.append('assistant_key', assistantKey);
    }

    if (tenantId) {
      params.append('tenant_id', tenantId);
    }

    if (voiceId) {
      params.append('voice_id', voiceId);
    }

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://api.iaura.ai'}/voice/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded', // REQUIRED: URL-encoded format
        'Authorization': `Bearer ${getToken()}`
      },
      body: params
    });

    if (!response.ok) {
      throw new Error(`Synthesis failed: ${response.status}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    let audioUrl = '';
    let cleanup = () => {};

    if (contentType.includes('application/json')) {
      const result = await response.json();

      if (result?.success === false) {
        throw new Error(result?.message || 'Speech synthesis unavailable.');
      }

      const payloadBase64 = result?.audio || result?.audioContent || '';
      const payloadUrl = result?.audio_url || result?.url || '';
      const payloadContentType =
        result?.content_type || result?.contentType || result?.mime_type || 'audio/mpeg';

      if (payloadBase64) {
        const binary = atob(payloadBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: payloadContentType });
        audioUrl = URL.createObjectURL(audioBlob);
        cleanup = () => URL.revokeObjectURL(audioUrl);
      } else if (payloadUrl) {
        audioUrl = payloadUrl;
      } else {
        throw new Error('No audio data received from synthesis service');
      }
    } else if (contentType.includes('audio/')) {
      const audioBlob = await response.blob();
      audioUrl = URL.createObjectURL(audioBlob);
      cleanup = () => URL.revokeObjectURL(audioUrl);
    } else {
      const unexpectedBody = await response.text().catch(() => '');
      throw new Error(
        `Unexpected content-type from synth service: ${contentType || 'unknown'}` +
          (unexpectedBody ? `. ${unexpectedBody}` : '')
      );
    }

    if (!audioUrl) {
      throw new Error('Unable to determine audio URL for playback');
    }

    const audio = new Audio(audioUrl);
    audio.preload = 'auto';

    const handleCleanup = () => {
      cleanup();
      audio.removeEventListener('ended', handleCleanup);
      audio.removeEventListener('error', handleError);
    };

    const handleError = () => {
      cleanup();
      audio.removeEventListener('ended', handleCleanup);
      audio.removeEventListener('error', handleError);
    };

    audio.addEventListener('ended', handleCleanup);
    audio.addEventListener('error', handleError);

    try {
      await audio.play();
    } catch (playError) {
      handleError();
      throw playError;
    }
  };

  if (!isConnected) {
    return (
      <div className="voice-call-page">
        <div className="container">
          <div className="call-redirect-card">
            <h2>Backend Not Connected</h2>
          <p>Please ensure the backend server is running on port 8000</p>
          <button onClick={checkBackendConnection} className="retry-button">
            Retry Connection
          </button>
          </div>
        </div>
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
                aria-label="Back"
              >
                ← Back
              </button>
              <div className="call-status">
                <span
                  className={`status-indicator ${isProcessing ? 'speaking' : isConnected ? 'listening' : 'disconnected'}`}
                  aria-hidden="true"
                />
                <div>
                  <p className="status-title">
                    {isProcessing ? 'AI Assistant is speaking' : 
                     isConnected ? 'Live conversation' : 
                     error ? 'Connection error' : 'Connected'}
                  </p>
                  <p className="status-time">{formatDuration(elapsedSeconds)}</p>
                </div>
              </div>
              <button type="button" className="end-call-button" onClick={handleEndCall}>
                End Call
              </button>
            </div>

            <div className="call-visualizer" role="status" aria-live="polite">
              <div className={`voice-circle ${isProcessing ? 'active' : ''}`}>
                <div className="pulse-ring ring-1" aria-hidden="true" />
                <div className="pulse-ring ring-2" aria-hidden="true" />
                <div className="pulse-ring ring-3" aria-hidden="true" />
                <div className="avatar-shell">
                  <span>🤖</span>
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
                <h1>Voice Assistant</h1>
                <p>AI-powered voice conversation</p>
              </div>

              <div className="call-controls">
                {!isRecording ? (
                  <button
                    type="button"
                    className="control-btn start"
                    onClick={startRecording}
                    disabled={isProcessing || !isConnected}
                  >
                    {isProcessing ? 'Processing...' : 
                     error ? 'Connection Error' :
                     !isConnected ? 'Connecting...' : 'Connect & Start'}
                  </button>
                ) : (
        <button
                    type="button"
                    className="control-btn stop"
                    onClick={stopRecording}
                  >
                    Stop Recording
        </button>
                )}
        <button
                  type="button" 
                  className={`control-btn mute ${isMuted ? 'muted' : ''}`}
                  onClick={() => setIsMuted(!isMuted)}
                  disabled={!isConnected}
                >
                  {isMuted ? 'Unmute microphone' : 'Mute microphone'}
        </button>
              </div>
            </div>
          </div>

          <aside className="transcription-panel">
            <div className="transcription-header">
              <h2>Live transcript</h2>
              <span className="transcription-status">Capturing both sides in real time</span>
      </div>
      
            <div className="transcription-body">
              {transcript.length === 0 && (
                <div className="transcription-placeholder">
                  <p>Ready for voice conversation. Click "Connect & Start" to begin.</p>
        </div>
      )}
      
              {transcript.map((entry, index) => (
                <div
                  key={index}
                  className={`transcription-line ${
                    entry.speaker === 'You' ? 'user-line' : 
                    entry.speaker === 'AI Assistant' ? 'assistant-line' : 'system-line'
                  }`}
                >
                  <div className="line-meta">
                    <strong className="speaker-name">{entry.speaker.toUpperCase()}</strong>
                    <time className="line-timestamp">
                  {entry.timestamp.toLocaleTimeString()}
                    </time>
                  </div>
                  <p className="line-content">{entry.text}</p>
                </div>
              ))}
              
              {error && (
                <div className="transcription-line system-line">
                  <div className="line-meta">
                    <strong className="speaker-name">SYSTEM</strong>
                </div>
                  <p className="line-content error-text">{error}</p>
              </div>
          )}
            </div>
          </aside>
        </div>
      </div>
      
      <style jsx>{`
        .voice-call-page {
          --primary-600: #4f46e5;
          --primary-700: #4338ca;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-400: #9ca3af;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
          --gray-800: #1f2937;
          --gray-900: #111827;
          --white: #ffffff;
          --green-50: #f0fdf4;
          --green-500: #10b981;
          --red-500: #ef4444;
          --red-600: #dc2626;
          --space-2: 0.5rem;
          --space-3: 0.75rem;
          --space-4: 1rem;
          --space-5: 1.25rem;
          --space-6: 1.5rem;
          --space-8: 2rem;
          --space-10: 2.5rem;
          --space-12: 3rem;
          --space-16: 4rem;
          --text-sm: 0.875rem;
          --text-base: 1rem;
          --text-lg: 1.125rem;
          --text-xl: 1.25rem;
          --text-2xl: 1.5rem;
          --text-3xl: 1.875rem;
          --text-4xl: 2.25rem;
          --font-weight-normal: 400;
          --font-weight-medium: 500;
          --font-weight-semibold: 600;
          --font-weight-bold: 700;
          --radius-md: 0.375rem;
          --radius-lg: 0.5rem;
          --radius-xl: 0.75rem;
          --radius-2xl: 1rem;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

          padding: var(--space-8) 0;
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(67, 97, 238, 0.08), transparent 65%),
                      var(--gray-50);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 var(--space-4);
        }

        .call-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: var(--space-8);
          align-items: start;
        }

        .call-stage {
          background: var(--white);
          border-radius: var(--radius-2xl);
          padding: var(--space-8);
          box-shadow: var(--shadow-lg);
        }

        .call-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-8);
        }

        .back-button {
          background: transparent;
          border: none;
          color: var(--gray-600);
          font-size: var(--text-base);
          cursor: pointer;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: var(--gray-100);
          color: var(--gray-900);
        }

        .call-status {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--gray-400);
        }

        .status-indicator.listening {
          background: var(--green-500);
          animation: pulse 2s infinite;
        }

        .status-indicator.speaking {
          background: var(--primary-600);
          animation: pulse 1s infinite;
        }

        .status-indicator.disconnected {
          background: var(--red-500);
        }

        .status-title {
          font-size: var(--text-base);
          font-weight: var(--font-weight-medium);
          color: var(--gray-900);
          margin: 0;
        }

        .status-time {
          font-size: var(--text-sm);
          color: var(--gray-500);
          margin: 0;
        }

        .end-call-button {
          background: var(--red-500);
          color: var(--white);
          border: none;
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-lg);
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .end-call-button:hover {
          background: var(--red-600);
        }

        .call-visualizer {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: var(--space-8);
        }

        .voice-circle {
          position: relative;
          width: 200px;
          height: 200px;
          margin-bottom: var(--space-6);
        }

        .pulse-ring {
          position: absolute;
          border: 2px solid var(--primary-600);
          border-radius: 50%;
          opacity: 0;
        }

        .voice-circle.active .pulse-ring {
          animation: pulsate 2s ease-out infinite;
        }

        .ring-1 {
          width: 100%;
          height: 100%;
        }

        .ring-2 {
          width: 120%;
          height: 120%;
          top: -10%;
          left: -10%;
          animation-delay: 0.5s;
        }

        .ring-3 {
          width: 140%;
          height: 140%;
          top: -20%;
          left: -20%;
          animation-delay: 1s;
        }

        .avatar-shell {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-4xl);
          color: var(--white);
          box-shadow: var(--shadow-xl);
        }

        .equalizer {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 3px;
          opacity: 0;
        }

        .voice-circle.active .equalizer {
          opacity: 1;
        }

        .equalizer span {
          width: 3px;
          height: 20px;
          background: var(--primary-600);
          border-radius: 2px;
          animation: equalize 0.8s ease-in-out infinite;
        }

        .equalizer span:nth-child(1) { animation-delay: 0s; }
        .equalizer span:nth-child(2) { animation-delay: 0.1s; }
        .equalizer span:nth-child(3) { animation-delay: 0.2s; }
        .equalizer span:nth-child(4) { animation-delay: 0.3s; }
        .equalizer span:nth-child(5) { animation-delay: 0.4s; }

        .assistant-meta h1 {
          font-size: var(--text-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin: 0 0 var(--space-2) 0;
        }

        .assistant-meta p {
          font-size: var(--text-lg);
          color: var(--gray-600);
          margin: 0 0 var(--space-8) 0;
        }

        .call-controls {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .control-btn {
          padding: var(--space-4) var(--space-6);
          border: none;
          border-radius: var(--radius-xl);
          font-size: var(--text-base);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 160px;
        }

        .control-btn.start {
          background: var(--primary-600);
          color: var(--white);
        }

        .control-btn.start:hover:not(:disabled) {
          background: var(--primary-700);
          transform: translateY(-1px);
        }

        .control-btn.stop {
          background: var(--red-500);
          color: var(--white);
        }

        .control-btn.stop:hover {
          background: var(--red-600);
          transform: translateY(-1px);
        }

        .control-btn.mute {
          background: var(--gray-200);
          color: var(--gray-700);
        }

        .control-btn.mute:hover:not(:disabled) {
          background: var(--gray-300);
        }

        .control-btn.muted {
          background: var(--red-100);
          color: var(--red-700);
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .transcription-panel {
          background: var(--white);
          border-radius: var(--radius-2xl);
          padding: var(--space-6);
          box-shadow: var(--shadow-lg);
          height: fit-content;
          max-height: 600px;
          display: flex;
          flex-direction: column;
        }

        .transcription-header {
          margin-bottom: var(--space-4);
        }

        .transcription-header h2 {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin: 0 0 var(--space-2) 0;
        }

        .transcription-status {
          font-size: var(--text-sm);
          color: var(--gray-500);
        }

        .transcription-body {
          flex: 1;
          overflow-y: auto;
          min-height: 200px;
        }

        .transcription-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          text-align: center;
          color: var(--gray-500);
        }

        .transcription-line {
          margin-bottom: var(--space-4);
          padding: var(--space-3);
          border-radius: var(--radius-lg);
        }

        .transcription-line.user-line {
          background: var(--gray-50);
          border-left: 3px solid var(--primary-600);
        }

        .transcription-line.assistant-line {
          background: var(--primary-600);
          color: var(--white);
        }

        .transcription-line.system-line {
          background: var(--red-50);
          border-left: 3px solid var(--red-500);
        }

        .line-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
        }

        .speaker-name {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
        }

        .line-timestamp {
          font-size: var(--text-sm);
          opacity: 0.7;
        }

        .line-content {
          font-size: var(--text-base);
          line-height: 1.5;
          margin: 0;
        }

        .error-text {
          color: var(--red-600);
        }

        .transcription-line.assistant-line .error-text {
          color: var(--white);
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
        
        .retry-button {
          background: var(--primary-600);
          color: var(--white);
          border: none;
          padding: var(--space-3) var(--space-6);
          border-radius: var(--radius-lg);
          font-size: var(--text-base);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .retry-button:hover {
          background: var(--primary-700);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes pulsate {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.4);
          }
        }

        @keyframes equalize {
          0%, 100% {
            height: 10px;
          }
          50% {
            height: 25px;
          }
        }

        @media (max-width: 1024px) {
          .call-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto;
            gap: var(--space-6);
          }
          
          .transcription-panel {
            order: -1;
            max-height: 300px;
          }
        }

        @media (max-width: 640px) {
          .voice-call-page {
            padding: var(--space-4) 0;
          }
          
          .container {
            padding: 0 var(--space-3);
          }
          
          .call-stage {
            padding: var(--space-6);
          }
          
          .voice-circle {
            width: 150px;
            height: 150px;
          }
          
          .avatar-shell {
            width: 90px;
            height: 90px;
            font-size: var(--text-3xl);
          }
          
          .call-controls {
            flex-direction: column;
            align-items: center;
          }
          
          .control-btn {
            min-width: 200px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductionVoiceChat;
