// voiceService.js - Voice Processing API Service
// Handles voice recording, speech-to-text, and text-to-speech functionality

import api from './api';

class VoiceService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.stream = null;
  }

  /**
   * Start voice recording
   * @returns {Promise<boolean>} Success status
   */
  async startRecording() {
    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      // Create MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];
      this.isRecording = true;

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      console.log('Voice recording started');
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.isRecording = false;
      return false;
    }
  }

  /**
   * Stop voice recording and return audio blob
   * @returns {Promise<Blob|null>} Audio blob or null if error
   */
  async stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        console.log('Voice recording stopped');
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  /**
   * Clean up media resources
   */
  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  /**
   * Send audio to backend for speech-to-text conversion
   * @param {Blob} audioBlob - Audio data
   * @param {string} userId - User ID
   * @returns {Promise<string>} Transcribed text
   */
  async speechToText(audioBlob, userId) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('user_id', userId);

      const response = await api.post('/voice/speech-to-text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Speech-to-text completed:', response.data.text);
      return response.data.text || '';
    } catch (error) {
      console.error('Speech-to-text error:', error);
      return '';
    }
  }

  /**
   * Send text to backend for text-to-speech conversion
   * @param {string} text - Text to convert
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} Audio URL or null
   */
  async textToSpeech(text, userId) {
    try {
      const response = await api.post('/voice/text-to-speech', {
        text: text,
        user_id: userId,
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.5
        }
      });

      if (response.data.audio_url) {
        console.log('Text-to-speech completed');
        return response.data.audio_url;
      }
      return null;
    } catch (error) {
      console.error('Text-to-speech error:', error);
      return null;
    }
  }

  /**
   * Play audio from URL
   * @param {string} audioUrl - URL of audio file
   * @returns {Promise<void>}
   */
  async playAudio(audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          console.log('Audio playback completed');
          resolve();
        };
        
        audio.onerror = (error) => {
      console.error('Audio playback error:', error);
          reject(error);
        };
        
        audio.play();
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  /**
   * Complete voice chat flow - record, transcribe, get AI response, and play
   * @param {string} userSlug - User slug for personalized response
   * @param {Function} onTranscription - Callback for transcription result
   * @param {Function} onResponse - Callback for AI response
   * @returns {Promise<Object>} Chat result
   */
  async voiceChat(userSlug, onTranscription = null, onResponse = null) {
    try {
      console.log('Starting voice chat with user:', userSlug);

      // Start recording
      const recordingStarted = await this.startRecording();
      if (!recordingStarted) {
        throw new Error('Failed to start recording');
      }

      // Wait for user to stop recording (this would be controlled by UI)
      // For now, we'll just return the recording promise
      return {
        stopRecording: async () => {
          const audioBlob = await this.stopRecording();
          if (!audioBlob) {
            throw new Error('No audio recorded');
          }

          // Convert speech to text
          const transcription = await this.speechToText(audioBlob, userSlug);
          if (onTranscription) onTranscription(transcription);

          if (!transcription) {
            throw new Error('Failed to transcribe audio');
          }

          // Send to AI for response
          const chatResponse = await api.post(`/voice/chat/${userSlug}`, {
            message: transcription,
            audio_response: true
          });

          const aiResponse = chatResponse.data.response;
          const audioUrl = chatResponse.data.audio_url;

          if (onResponse) onResponse(aiResponse);

          // Play AI response
          if (audioUrl) {
            await this.playAudio(audioUrl);
          }

          return {
            transcription,
            response: aiResponse,
            audioUrl
          };
        }
      };
    } catch (error) {
      console.error('Voice chat error:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Get voice chat status
   * @returns {Object} Current recording status
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      hasPermission: !!this.stream,
      isSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    };
  }

  /**
   * Check if browser supports voice features
   * @returns {boolean} Support status
   */
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }
}

// Create and export singleton instance
const voiceService = new VoiceService();

export default voiceService;