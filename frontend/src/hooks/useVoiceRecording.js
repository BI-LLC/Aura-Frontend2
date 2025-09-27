// Aura Voice AI - Voice Recording Hook
// ===================================

import { useState, useRef, useCallback } from 'react';

/**
 * useVoiceRecording Hook
 * 
 * Custom hook for handling voice recording functionality
 * Provides recording, stopping, and audio processing capabilities
 */
export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Check browser support
  const checkSupport = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
      setError('Voice recording is not supported in this browser');
      return false;
    }
    return true;
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!checkSupport()) return false;

    try {
      setError(null);
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus' // Use WebM format for better compatibility
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        setError('Recording error: ' + event.error.message);
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      return true;
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
      setIsRecording(false);
      return false;
    }
  }, [checkSupport]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  }, [isRecording, isPaused]);

  // Clear recording
  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingTime(0);
    setError(null);
  }, []);

  // Get audio URL for playback
  const getAudioUrl = useCallback(() => {
    if (audioBlob) {
      return URL.createObjectURL(audioBlob);
    }
    return null;
  }, [audioBlob]);

  // Convert audio blob to base64
  const getAudioBase64 = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!audioBlob) {
        reject(new Error('No audio recorded'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }, [audioBlob]);

  // Format recording time as MM:SS
  const getFormattedTime = useCallback(() => {
    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [recordingTime]);

  // Get recording state
  const getRecordingState = useCallback(() => {
    if (isRecording && isPaused) return 'paused';
    if (isRecording) return 'recording';
    if (audioBlob) return 'recorded';
    return 'idle';
  }, [isRecording, isPaused, audioBlob]);

  // Check if recording is available
  const hasRecording = Boolean(audioBlob);

  // Get audio duration (approximate based on recording time)
  const getAudioDuration = useCallback(() => {
    return recordingTime; // This is approximate - for exact duration, you'd need to analyze the blob
  }, [recordingTime]);

  // Clean up on unmount
  const cleanup = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [isRecording, stopRecording]);

  return {
    // State
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    error,
    isSupported,
    hasRecording,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    cleanup,

    // Getters
    getAudioUrl,
    getAudioBase64,
    getFormattedTime,
    getRecordingState,
    getAudioDuration,

    // Utils
    checkSupport
  };
};

export default useVoiceRecording;