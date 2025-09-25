import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Production-Ready Voice Chat Component
 * Uses direct HTTP endpoints like BIC.py and Demo.py
 * Simple, reliable, and production-ready
 */
const ProductionVoiceChat = () => {
  const { user, getToken } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Check backend connection on mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.status === 'healthy');
      }
    } catch (err) {
      console.error('Backend connection check failed:', err);
      setIsConnected(false);
    }
  };

  // Test microphone function
  const testMicrophone = async () => {
    try {
      console.log('Testing microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      console.log('Microphone test successful:', stream);
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Test audio levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      let testCount = 0;
      const testAudioLevel = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        console.log(`Audio test ${testCount}: level = ${average}`);
        testCount++;
        
        if (testCount < 10) {
          setTimeout(testAudioLevel, 100);
        } else {
          stream.getTracks().forEach(track => track.stop());
          console.log('Microphone test completed');
        }
      };
      
      testAudioLevel();
      
    } catch (error) {
      console.error('Microphone test failed:', error);
      setError(`Microphone test failed: ${error.message}`);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      
      // Check if user is authenticated
      const token = getToken();
      if (!token) {
        setError('Please log in to use voice chat');
        return;
      }

      // Check microphone permission first
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        console.log('Microphone permission:', permission.state);
      } catch (e) {
        console.log('Permission API not supported:', e);
      }

        // Get microphone permission with PyAudio-compatible settings
        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,        // Match PyAudio RATE = 16000
            channelCount: 1,          // Match PyAudio CHANNELS = 1
            echoCancellation: false, // Raw audio like PyAudio
            noiseSuppression: false, // Raw audio like PyAudio
            autoGainControl: false,  // Raw audio like PyAudio
            latency: 0.01,           // Low latency like PyAudio
            volume: 1.0              // Full volume
          } 
        });
      console.log('Microphone access granted, stream:', stream);
      
      // Create audio context for level monitoring
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      // Monitor audio levels for voice activity detection
      let lastVoiceActivity = Date.now();
      const checkAudioLevel = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // Voice activity detection (threshold can be adjusted)
        const voiceThreshold = 20;
        setAudioLevel(average);
        
        // Debug: Log audio levels every 30 frames (about 0.5 seconds)
        if (Date.now() % 500 < 50) {
          console.log('Audio level:', average, 'threshold:', voiceThreshold);
        }
        
        if (average > voiceThreshold) {
          lastVoiceActivity = Date.now();
          setIsVoiceActive(true);
          console.log('Voice activity detected, level:', average);
        } else {
          setIsVoiceActive(false);
        }
        
        // Check if we've had recent voice activity
        const timeSinceActivity = Date.now() - lastVoiceActivity;
        if (timeSinceActivity > 3000 && isRecording) { // 3 seconds of silence
          console.log('No voice activity for 3 seconds, stopping recording');
          stopRecording();
        }
        
        if (isRecording) {
          requestAnimationFrame(checkAudioLevel);
        }
      };
      checkAudioLevel();
      
      // Create MediaRecorder with BIC.py/Demo.py compatible settings
      let mediaRecorder;
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          console.log('Using audio format:', mimeType);
          mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            audioBitsPerSecond: 128000
          });
          break;
        }
      }
      
      if (!mediaRecorder) {
        throw new Error('No supported audio format found');
      }
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk received, size:', event.data.size, 'type:', event.data.type);
          
          // Process audio in real-time if we have enough data
          if (audioChunksRef.current.length >= 2) { // Process every 2 chunks (1 second)
            console.log('Processing audio chunks in real-time');
            processAudioChunks();
          }
        } else {
          console.log('Empty audio chunk received');
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError(`Recording error: ${event.error.message}`);
      };
      
      mediaRecorder.onstop = () => {
        processAudio();
      };
      
      mediaRecorder.start(500); // Record in 0.5-second chunks for better responsiveness
      setIsRecording(true);
      
      // Dynamic timeout based on voice activity
      let silenceTimeout;
      const resetSilenceTimeout = () => {
        clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => {
          if (isRecording) {
            console.log('Silence detected, stopping recording');
            stopRecording();
          }
        }, 2000); // Stop after 2 seconds of silence
      };
      
      // Start the silence timeout
      resetSilenceTimeout();
      
      // Monitor for voice activity to reset timeout
      const checkVoiceActivity = () => {
        if (isRecording) {
          // Check if we have recent audio chunks
          const recentChunks = audioChunksRef.current.slice(-3); // Last 3 chunks
          const hasRecentActivity = recentChunks.some(chunk => chunk.size > 100);
          
          if (hasRecentActivity) {
            resetSilenceTimeout();
          }
          
          requestAnimationFrame(checkVoiceActivity);
        }
      };
      checkVoiceActivity();
      
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const processAudioChunks = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('No audio chunks to process');
      return;
    }
    
    console.log('Processing audio chunks in real-time, chunks:', audioChunksRef.current.length);
    
    try {
      // Create audio blob from recent chunks
      const recentChunks = audioChunksRef.current.slice(-3); // Last 3 chunks
      const audioBlob = new Blob(recentChunks, { type: 'audio/webm' });
      console.log('Real-time audio blob created, size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size < 1000) { // Skip very small audio blobs
        console.log('Audio blob too small, skipping');
        return;
      }
      
      // Transcribe audio using direct endpoint
      const transcription = await transcribeAudio(audioBlob);
      
      if (transcription && transcription.trim()) {
        console.log('Real-time transcription:', transcription);
        // Add user transcript
        setTranscript(prev => [...prev, {
          speaker: 'You',
          text: transcription,
          timestamp: new Date()
        }]);
        
        // Get AI response
        const response = await getAIResponse(transcription);
        
        if (response) {
          // Add AI transcript
          setTranscript(prev => [...prev, {
            speaker: 'AI Assistant',
            text: response,
            timestamp: new Date()
          }]);
          
          // Synthesize and play AI response
          await synthesizeSpeech(response);
        }
      }
    } catch (err) {
      console.error('Real-time processing error:', err);
    }
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('No audio chunks to process');
      return;
    }
    
    console.log('Processing final audio, chunks:', audioChunksRef.current.length);
    setIsProcessing(true);
    
    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('Final audio blob created, size:', audioBlob.size, 'bytes');
      
      // Transcribe audio using direct endpoint
      const transcription = await transcribeAudio(audioBlob);
      
      if (transcription && transcription.trim()) {
        // Add user transcript
        setTranscript(prev => [...prev, {
          speaker: 'You',
          text: transcription,
          timestamp: new Date()
        }]);
        
        // Get AI response
        const response = await getAIResponse(transcription);
        
        if (response) {
          // Add AI transcript
          setTranscript(prev => [...prev, {
            speaker: 'AI Assistant',
            text: response,
            timestamp: new Date()
          }]);
          
          // Synthesize speech
          await synthesizeSpeech(response);
        }
      } else {
        setError('No speech detected. Please try again.');
      }
      
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    console.log('Sending audio for transcription, size:', audioBlob.size);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('language', 'en');
    
    const response = await fetch('/voice/transcribe', {
      method: 'POST',
      body: formData
    });
    console.log('Transcription response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Transcription result:', result);
    return result.text;
  };

  const getAIResponse = async (message) => {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: message,
        user_id: user?.id || 'default_user',
        organization: 'AURA',
        use_memory: true,
        search_knowledge: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Chat failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.response;
  };

  const synthesizeSpeech = async (text) => {
    const response = await fetch('/voice/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        text: text.substring(0, 500), // Limit text length
        stability: '0.5',
        similarity_boost: '0.75'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Synthesis failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.audio) {
      // Play audio
      const audioBytes = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      await audio.play();
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    }
  };

  const clearTranscript = () => {
    setTranscript([]);
    setError(null);
  };

  if (!isConnected) {
    return (
      <div className="voice-chat-container">
        <div className="connection-error">
          <h3>Backend Not Connected</h3>
          <p>Please ensure the backend server is running on port 8000</p>
          <button onClick={checkBackendConnection} className="retry-button">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-chat-container">
      <div className="voice-header">
        <h2>Voice Chat</h2>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '✓ Connected' : '✗ Disconnected'}
        </div>
      </div>
      
      <div className="voice-controls">
        <button
          className={`record-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        
        <button
          className="clear-button"
          onClick={clearTranscript}
          disabled={isProcessing}
        >
          Clear Chat
        </button>
        
        <button
          className="test-button"
          onClick={testMicrophone}
          disabled={isProcessing}
        >
          Test Microphone
        </button>
      </div>
      
      {isRecording && (
        <div className="voice-activity">
          <div className="audio-level-bar">
            <div 
              className="audio-level-fill" 
              style={{ 
                width: `${Math.min(audioLevel * 2, 100)}%`,
                backgroundColor: isVoiceActive ? '#4CAF50' : '#2196F3'
              }}
            />
          </div>
          <div className="voice-status">
            {isVoiceActive ? '🎤 Speaking...' : '🔇 Listening...'}
          </div>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="transcript-container">
        <h3>Conversation</h3>
        <div className="transcript">
          {transcript.length === 0 ? (
            <p className="empty-transcript">
              Click "Start Recording" to begin a voice conversation
            </p>
          ) : (
            transcript.map((entry, index) => (
              <div key={index} className={`transcript-entry ${entry.speaker.toLowerCase().replace(' ', '-')}`}>
                <div className="speaker">{entry.speaker}</div>
                <div className="text">{entry.text}</div>
                <div className="timestamp">
                  {entry.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <style jsx>{`
        .voice-chat-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .voice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .connection-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .connection-status.connected {
          background-color: #d4edda;
          color: #155724;
        }
        
        .connection-status.disconnected {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        .voice-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .record-button {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          background-color: #007bff;
          color: white;
        }
        
        .record-button:hover:not(:disabled) {
          background-color: #0056b3;
        }
        
        .record-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .record-button.recording {
          background-color: #dc3545;
          animation: pulse 1s infinite;
        }
        
        .record-button.processing {
          background-color: #ffc107;
          color: #000;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        
        .voice-activity {
          margin: 20px 0;
          text-align: center;
        }
        
        .audio-level-bar {
          width: 100%;
          height: 20px;
          background-color: #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        
        .audio-level-fill {
          height: 100%;
          transition: width 0.1s ease;
          border-radius: 10px;
        }
        
        .voice-status {
          font-size: 16px;
          font-weight: bold;
          color: #666;
        }
        
        .clear-button {
          padding: 12px 24px;
          border: 1px solid #6c757d;
          border-radius: 6px;
        }
        
        .test-button {
          padding: 12px 24px;
          border: 1px solid #17a2b8;
          border-radius: 6px;
          background-color: white;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .clear-button:hover:not(:disabled) {
          background-color: #6c757d;
          color: white;
        }
        
        .error-message {
          background-color: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .transcript-container {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .transcript-container h3 {
          margin: 0;
          padding: 12px 16px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          font-size: 16px;
        }
        
        .transcript {
          max-height: 400px;
          overflow-y: auto;
          padding: 16px;
        }
        
        .empty-transcript {
          text-align: center;
          color: #6c757d;
          font-style: italic;
          margin: 20px 0;
        }
        
        .transcript-entry {
          margin-bottom: 16px;
          padding: 12px;
          border-radius: 6px;
          border-left: 4px solid #dee2e6;
        }
        
        .transcript-entry.you {
          background-color: #e3f2fd;
          border-left-color: #2196f3;
        }
        
        .transcript-entry.ai-assistant {
          background-color: #f3e5f5;
          border-left-color: #9c27b0;
        }
        
        .speaker {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
          color: #495057;
        }
        
        .text {
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 4px;
        }
        
        .timestamp {
          font-size: 12px;
          color: #6c757d;
        }
        
        .connection-error {
          text-align: center;
          padding: 40px;
          background-color: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }
        
        .retry-button {
          padding: 8px 16px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        }
        
        .retry-button:hover {
          background-color: #0056b3;
        }
      `}</style>
    </div>
  );
};

export default ProductionVoiceChat;
