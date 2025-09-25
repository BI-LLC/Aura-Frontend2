"""
Enhanced Voice Activity Detection (VAD) - Critical for natural conversation flow
Mock version that doesn't require webrtcvad for development/testing
"""

import numpy as np
import collections
import logging
from typing import Optional, Tuple, List
import struct
import time

logger = logging.getLogger(__name__)

# Mock webrtcvad for development
class MockWebRTCVAD:
    def __init__(self, aggressiveness: int = 2):
        self.aggressiveness = aggressiveness
        logger.warning("Using mock WebRTC VAD - voice activity detection will be simulated")
    
    def is_speech(self, audio_chunk: bytes, sample_rate: int) -> bool:
        # Simple mock implementation - simulate speech detection
        # In a real implementation, this would use the actual webrtcvad library
        return len(audio_chunk) > 0  # Simple mock - always return True for now

# Try to import real webrtcvad, fall back to mock
try:
    import webrtcvad
    WebRTCVAD = webrtcvad.Vad
    logger.info("Real WebRTC VAD loaded successfully")
except ImportError:
    WebRTCVAD = MockWebRTCVAD
    logger.warning("WebRTC VAD not available, using mock implementation")

class EnhancedVoiceActivityDetector:
    def __init__(self, sample_rate: int = 16000, frame_duration: int = 30, aggressiveness: int = 2):
        """
        Enhanced Voice Activity Detection with improved accuracy and performance
        
        Args:
            sample_rate: Audio sample rate (16000 for high quality)
            frame_duration: Frame size in ms (10, 20, or 30)
            aggressiveness: VAD aggressiveness level (0-3, higher = more aggressive)
        """
        self.sample_rate = sample_rate
        self.frame_duration = frame_duration
        self.aggressiveness = aggressiveness
        
        # Initialize WebRTC VAD (or mock)
        try:
            self.vad = WebRTCVAD(aggressiveness)
            logger.info(f"VAD initialized with aggressiveness {aggressiveness}")
        except Exception as e:
            logger.error(f"Failed to initialize VAD: {e}")
            # Fall back to mock
            self.vad = MockWebRTCVAD(aggressiveness)
        
        # Calculate frame parameters
        self.frame_length = int(sample_rate * frame_duration / 1000)  # samples per frame
        self.frame_bytes = self.frame_length * 2  # 16-bit samples = 2 bytes each
        
        # Enhanced buffering system
        self.ring_buffer = collections.deque(maxlen=50)  # Increased buffer size
        self.speech_frames = []
        self.silence_frames = []
        
        # State management
        self.is_in_speech = False
        self.speech_start_time = None
        self.last_speech_time = None
        
        # Adaptive thresholds
        self.speech_threshold = 0.6      # 60% frames must be speech to start
        self.silence_threshold = 0.8     # 80% frames must be silence to end
        self.min_speech_frames = 8       # Minimum frames for valid speech (~240ms)
        self.max_silence_frames = 20     # Maximum silence frames before end (~600ms)
        self.min_speech_duration = 0.3   # Minimum speech duration in seconds
        
        # Performance tracking
        self.stats = {
            'total_frames': 0,
            'speech_frames': 0,
            'silence_frames': 0,
            'speech_segments': 0,
            'false_positives': 0
        }
        
        logger.info("Enhanced VAD initialized for natural conversation flow")
    
    def process_audio_chunk(self, audio_chunk: bytes) -> Tuple[bool, bool, Optional[bytes]]:
        """
        Process audio chunk with enhanced VAD logic
        
        Args:
            audio_chunk: Raw audio bytes (16-bit PCM)
            
        Returns:
            Tuple of (is_speaking, speech_complete, accumulated_audio)
            - is_speaking: True if user is currently speaking
            - speech_complete: True if complete speech segment detected
            - accumulated_audio: Complete audio data when speech_complete=True
        """
        self.stats['total_frames'] += 1
        
        # Validate audio chunk size
        if len(audio_chunk) != self.frame_bytes:
            logger.debug(f"Invalid frame size: {len(audio_chunk)} bytes, expected {self.frame_bytes}")
            return False, False, None
        
        # Detect voice activity using VAD (real or mock)
        try:
            is_speech = self.vad.is_speech(audio_chunk, self.sample_rate)
        except Exception as e:
            logger.error(f"VAD processing error: {e}")
            return False, False, None
        
        # Update ring buffer
        self.ring_buffer.append(1 if is_speech else 0)
        
        # Update stats
        if is_speech:
            self.stats['speech_frames'] += 1
            self.speech_frames.append(audio_chunk)
            self.silence_frames.clear()
        else:
            self.stats['silence_frames'] += 1
            self.silence_frames.append(audio_chunk)
        
        # Determine speech state
        speech_ratio = sum(self.ring_buffer) / len(self.ring_buffer) if self.ring_buffer else 0
        
        # Speech start detection
        if not self.is_in_speech and speech_ratio >= self.speech_threshold:
            if len(self.speech_frames) >= self.min_speech_frames:
                self.is_in_speech = True
                self.speech_start_time = time.time()
                logger.debug("Speech started")
        
        # Speech end detection
        elif self.is_in_speech and speech_ratio <= (1 - self.silence_threshold):
            if len(self.silence_frames) >= self.max_silence_frames:
                # Check minimum speech duration
                if self.speech_start_time and (time.time() - self.speech_start_time) >= self.min_speech_duration:
                    self.is_in_speech = False
                    self.last_speech_time = time.time()
                    
                    # Accumulate complete speech audio
                    complete_audio = b''.join(self.speech_frames)
                    self.speech_frames.clear()
                    
                    self.stats['speech_segments'] += 1
                    logger.debug(f"Speech ended, duration: {time.time() - self.speech_start_time:.2f}s")
                    
                    return False, True, complete_audio
                else:
                    # Reset if speech was too short
                    self.speech_frames.clear()
                    self.is_in_speech = False
        
        return self.is_in_speech, False, None
    
    def _process_speech_state(self, audio_chunk: bytes, speech_ratio: float, is_speech: bool) -> Tuple[bool, bool, Optional[bytes]]:
        """
        Process speech state with enhanced logic
        """
        current_time = time.time()
        
        if not self.is_in_speech:
            # Not currently in speech - check for start
            if speech_ratio > self.speech_threshold:
                # Speech detected - start collecting
                self.is_in_speech = True
                self.speech_start_time = current_time
                self.last_speech_time = current_time
                self.speech_frames = [audio_chunk]
                self.silence_frames = []
                
                logger.debug("Speech started")
                return True, False, None
            else:
                # Still in silence
                return False, False, None
        
        else:
            # Currently in speech
            self.last_speech_time = current_time
            
            if is_speech or speech_ratio > (1 - self.silence_threshold):
                # Continue speech
                self.speech_frames.append(audio_chunk)
                self.silence_frames = []  # Reset silence counter
                return True, False, None
            
            else:
                # Potential end of speech - accumulate silence
                self.silence_frames.append(audio_chunk)
                
                # Check if we have enough silence to end speech
                if len(self.silence_frames) >= self.max_silence_frames:
                    return self._end_speech_segment()
                else:
                    # Still in speech, just some silence
                    self.speech_frames.append(audio_chunk)
                    return True, False, None
    
    def _end_speech_segment(self) -> Tuple[bool, bool, Optional[bytes]]:
        """
        End current speech segment and return accumulated audio
        """
        # Validate speech segment
        if not self._is_valid_speech_segment():
            # Too short or invalid - discard
            self._reset_state()
            return False, False, None
        
        # Combine all speech frames (excluding trailing silence)
        complete_audio = b''.join(self.speech_frames)
        
        # Update stats
        self.stats['speech_segments'] += 1
        
        speech_duration = time.time() - self.speech_start_time
        logger.debug(f"Speech completed: {speech_duration:.2f}s, {len(complete_audio)} bytes")
        
        # Reset state
        self._reset_state()
        
        return False, True, complete_audio
    
    def _is_valid_speech_segment(self) -> bool:
        """
        Validate if current speech segment is worth processing
        """
        # Check minimum frame count
        if len(self.speech_frames) < self.min_speech_frames:
            logger.debug("Speech segment too short (frames)")
            return False
        
        # Check minimum duration
        if self.speech_start_time:
            duration = time.time() - self.speech_start_time
            if duration < self.min_speech_duration:
                logger.debug(f"Speech segment too short (duration): {duration:.2f}s")
                return False
        
        # Check audio content (simple energy check)
        if not self._has_sufficient_energy():
            logger.debug("Speech segment has insufficient energy")
            return False
        
        return True
    
    def _has_sufficient_energy(self) -> bool:
        """
        Check if speech frames have sufficient energy to be valid speech
        """
        if not self.speech_frames:
            return False
        
        # Sample a few frames to check energy
        sample_frames = self.speech_frames[::max(1, len(self.speech_frames) // 5)]
        
        total_energy = 0
        for frame in sample_frames:
            # Convert bytes to int16 array
            samples = np.frombuffer(frame, dtype=np.int16)
            # Calculate RMS energy
            energy = np.sqrt(np.mean(samples.astype(np.float32) ** 2))
            total_energy += energy
        
        average_energy = total_energy / len(sample_frames)
        
        # Threshold for minimum speech energy (adjust based on testing)
        min_energy_threshold = 100  # Adjust this value based on your audio setup
        
        return average_energy > min_energy_threshold
    
    def _reset_state(self):
        """
        Reset VAD state for next speech segment
        """
        self.is_in_speech = False
        self.speech_start_time = None
        self.last_speech_time = None
        self.speech_frames = []
        self.silence_frames = []
    
    def force_reset(self):
        """
        Force reset of VAD state (useful for interruptions)
        """
        logger.debug("VAD force reset")
        self.ring_buffer.clear()
        self._reset_state()
    
    def get_stats(self) -> dict:
        """
        Get VAD performance statistics
        """
        total_frames = self.stats['total_frames']
        if total_frames == 0:
            return self.stats
        
        return {
            **self.stats,
            'speech_ratio': self.stats['speech_frames'] / total_frames,
            'silence_ratio': self.stats['silence_frames'] / total_frames,
            'avg_speech_per_segment': self.stats['speech_frames'] / max(1, self.stats['speech_segments'])
        }
    
    def adjust_sensitivity(self, more_sensitive: bool = True):
        """
        Dynamically adjust VAD sensitivity based on performance
        """
        if more_sensitive:
            # Make more sensitive to speech
            self.speech_threshold = max(0.3, self.speech_threshold - 0.1)
            self.silence_threshold = min(0.9, self.silence_threshold + 0.1)
            self.min_speech_frames = max(5, self.min_speech_frames - 2)
        else:
            # Make less sensitive (reduce false positives)
            self.speech_threshold = min(0.8, self.speech_threshold + 0.1)
            self.silence_threshold = max(0.6, self.silence_threshold - 0.1)
            self.min_speech_frames = min(15, self.min_speech_frames + 2)
        
        logger.info(f"VAD sensitivity adjusted: speech_threshold={self.speech_threshold:.2f}, "
                   f"silence_threshold={self.silence_threshold:.2f}")
    
    def is_currently_speaking(self) -> bool:
        """
        Check if user is currently speaking
        """
        return self.is_in_speech and self.last_speech_time and (time.time() - self.last_speech_time) < 1.0


class AdaptiveVAD:
    """
    Adaptive VAD that learns from user behavior and adjusts parameters
    """
    
    def __init__(self, sample_rate: int = 16000):
        self.vad = EnhancedVoiceActivityDetector(sample_rate)
        self.adaptation_history = []
        self.false_positive_count = 0
        self.missed_speech_count = 0
        
    def process_audio_chunk(self, audio_chunk: bytes) -> Tuple[bool, bool, Optional[bytes]]:
        """
        Process audio with adaptive parameters
        """
        result = self.vad.process_audio_chunk(audio_chunk)
        
        # Track performance for adaptation
        self._track_performance(result)
        
        # Adapt if needed
        if len(self.adaptation_history) > 100:
            self._adapt_parameters()
        
        return result
    
    def _track_performance(self, result: Tuple[bool, bool, Optional[bytes]]):
        """
        Track VAD performance for adaptation
        """
        is_speaking, speech_complete, audio_data = result
        
        # Simple heuristics for performance tracking
        if speech_complete and audio_data and len(audio_data) < 1000:
            # Very short speech might be false positive
            self.false_positive_count += 1
        
        self.adaptation_history.append({
            'timestamp': time.time(),
            'is_speaking': is_speaking,
            'speech_complete': speech_complete,
            'audio_length': len(audio_data) if audio_data else 0
        })
    
    def _adapt_parameters(self):
        """
        Adapt VAD parameters based on performance history
        """
        recent_history = self.adaptation_history[-100:]
        
        # Calculate metrics
        false_positive_rate = self.false_positive_count / len(recent_history)
        
        if false_positive_rate > 0.1:  # Too many false positives
            logger.info("Reducing VAD sensitivity due to false positives")
            self.vad.adjust_sensitivity(more_sensitive=False)
            self.false_positive_count = 0
        
        # Reset history
        self.adaptation_history = self.adaptation_history[-50:]
    
    def report_false_positive(self):
        """
        Report a false positive to help adaptation
        """
        self.false_positive_count += 1
        logger.debug("False positive reported")
    
    def report_missed_speech(self):
        """
        Report missed speech to help adaptation
        """
        self.missed_speech_count += 1
        logger.debug("Missed speech reported")
        
        if self.missed_speech_count > 3:
            logger.info("Increasing VAD sensitivity due to missed speech")
            self.vad.adjust_sensitivity(more_sensitive=True)
            self.missed_speech_count = 0


# Factory function for easy instantiation
def create_voice_activity_detector(
    sample_rate: int = 16000,
    adaptive: bool = True,
    aggressiveness: int = 2
) -> EnhancedVoiceActivityDetector:
    """
    Factory function to create appropriate VAD instance
    
    Args:
        sample_rate: Audio sample rate
        adaptive: Whether to use adaptive VAD
        aggressiveness: WebRTC VAD aggressiveness (0-3)
    
    Returns:
        VAD instance
    """
    if adaptive:
        return AdaptiveVAD(sample_rate)
    else:
        return EnhancedVoiceActivityDetector(sample_rate, aggressiveness=aggressiveness)
