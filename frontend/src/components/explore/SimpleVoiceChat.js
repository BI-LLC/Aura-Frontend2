import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './VoiceChat.css';

const SimpleVoiceChat = () => {
  const { user, getToken } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);

  // Simple voice chat using direct HTTP endpoints (like BIC.py)
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        processAudio();
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 10 seconds (like BIC.py)
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 10000);
      
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

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to WAV format for backend compatibility
      const wavBlob = await convertToWav(audioBlob);
      
      // Transcribe audio
      const transcription = await transcribeAudio(wavBlob);
      
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
            speaker: 'AI',
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

  const convertToWav = async (audioBlob) => {
    // Simple conversion - in production, use a proper audio converter
    return audioBlob;
  };

  const transcribeAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    formData.append('language', 'en');
    
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://api.iaura.ai'}/voice/transcribe`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.text;
  };

  const getAIResponse = async (message) => {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://api.iaura.ai'}/chat`, {
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
      text: text.substring(0, 500), // Limit text length
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
        'Content-Type': 'application/x-www-form-urlencoded'
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

  const clearTranscript = () => {
    setTranscript([]);
    setError(null);
  };

  return (
    <div className="simple-voice-chat">
      <div className="voice-controls">
        <button
          className={`record-button ${isRecording ? 'recording' : ''}`}
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
          Clear
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="transcript-container">
        <h3>Conversation</h3>
        <div className="transcript">
          {transcript.length === 0 ? (
            <p className="empty-transcript">Start a conversation by clicking "Start Recording"</p>
          ) : (
            transcript.map((entry, index) => (
              <div key={index} className={`transcript-entry ${entry.speaker.toLowerCase()}`}>
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
    </div>
  );
};

export default SimpleVoiceChat;
