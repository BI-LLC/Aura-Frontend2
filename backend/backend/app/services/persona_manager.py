"""
Persona Manager Service

Handles user communication style preferences and personalization.
Adapts AI responses based on user feedback and preferences.
"""

import logging
from typing import Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@dataclass
class PersonaSettings:
    """User persona settings for communication style"""
    formality: str = "neutral"  # formal, neutral, casual
    detail_level: str = "medium"  # low, medium, high
    example_style: str = "practical"  # practical, theoretical, story-based
    energy: str = "balanced"  # low, balanced, high
    last_updated: datetime = None
    
    def __post_init__(self):
        if self.last_updated is None:
            self.last_updated = datetime.now()

class PersonaManager:
    """Manages user communication style preferences and learning"""
    
    def __init__(self):
        self.personas: Dict[str, PersonaSettings] = {}
        self.feedback_history: Dict[str, list] = {}
        self.learning_rate = 0.1
        
    async def get_persona_stats(self, user_id: str) -> Optional[PersonaSettings]:
        """Get persona settings for a user"""
        if user_id not in self.personas:
            # Return default persona for new users
            return PersonaSettings()
        return self.personas[user_id]
    
    async def set_manual_persona(self, user_id: str, settings: Dict[str, str]) -> PersonaSettings:
        """Set persona settings manually"""
        persona = PersonaSettings(
            formality=settings.get("formality", "neutral"),
            detail_level=settings.get("detail_level", "medium"),
            example_style=settings.get("example_style", "practical"),
            energy=settings.get("energy", "balanced")
        )
        self.personas[user_id] = persona
        logger.info(f"Set manual persona for user {user_id}: {settings}")
        return persona
    
    async def apply_persona_to_message(self, message: str, user_id: str) -> str:
        """Apply persona settings to enhance a message"""
        persona = await self.get_persona_stats(user_id)
        if not persona:
            return message
            
        enhanced_message = message
        
        # Apply formality
        if persona.formality == "formal":
            enhanced_message = self._make_formal(enhanced_message)
        elif persona.formality == "casual":
            enhanced_message = self._make_casual(enhanced_message)
            
        # Apply detail level
        if persona.detail_level == "high":
            enhanced_message = self._add_detail(enhanced_message)
        elif persona.detail_level == "low":
            enhanced_message = self._simplify(enhanced_message)
            
        # Apply energy
        if persona.energy == "high":
            enhanced_message = self._add_enthusiasm(enhanced_message)
        elif persona.energy == "low":
            enhanced_message = self._calm_tone(enhanced_message)
            
        return enhanced_message
    
    async def update_persona(self, user_id: str, feedback: Dict[str, Any]) -> None:
        """Update persona based on user feedback"""
        if user_id not in self.personas:
            self.personas[user_id] = PersonaSettings()
            
        if user_id not in self.feedback_history:
            self.feedback_history[user_id] = []
            
        # Store feedback
        self.feedback_history[user_id].append({
            "timestamp": datetime.now(),
            "feedback": feedback
        })
        
        # Learn from feedback (simplified learning)
        if feedback.get("rating") and feedback["rating"] > 3:
            # Positive feedback - reinforce current style
            logger.info(f"Positive feedback for user {user_id}, reinforcing persona")
        elif feedback.get("rating") and feedback["rating"] < 3:
            # Negative feedback - consider adjusting
            logger.info(f"Negative feedback for user {user_id}, may adjust persona")
            
        # Clean old feedback (keep last 50)
        if len(self.feedback_history[user_id]) > 50:
            self.feedback_history[user_id] = self.feedback_history[user_id][-50:]
    
    def _make_formal(self, message: str) -> str:
        """Make message more formal"""
        # Simple formalization rules
        replacements = {
            "don't": "do not",
            "can't": "cannot",
            "won't": "will not",
            "I'm": "I am",
            "you're": "you are"
        }
        for informal, formal in replacements.items():
            message = message.replace(informal, formal)
        return message
    
    def _make_casual(self, message: str) -> str:
        """Make message more casual"""
        # Simple casualization rules
        replacements = {
            "do not": "don't",
            "cannot": "can't",
            "will not": "won't",
            "I am": "I'm",
            "you are": "you're"
        }
        for formal, informal in replacements.items():
            message = message.replace(formal, informal)
        return message
    
    def _add_detail(self, message: str) -> str:
        """Add more detail to message"""
        # Simple detail enhancement
        if "because" not in message.lower():
            message += " This approach ensures better results and user satisfaction."
        return message
    
    def _simplify(self, message: str) -> str:
        """Simplify message"""
        # Simple simplification
        if len(message) > 100:
            # Take first sentence if message is long
            sentences = message.split('.')
            if sentences:
                message = sentences[0].strip() + "."
        return message
    
    def _add_enthusiasm(self, message: str) -> str:
        """Add enthusiasm to message"""
        if not any(word in message.lower() for word in ["great", "awesome", "excellent", "fantastic"]):
            message += " This is great!"
        return message
    
    def _calm_tone(self, message: str) -> str:
        """Calm the tone of message"""
        # Remove exclamation marks for calmer tone
        message = message.replace("!", ".")
        return message
    
    async def get_persona_analytics(self, user_id: str) -> Dict[str, Any]:
        """Get analytics about persona usage and feedback"""
        if user_id not in self.feedback_history:
            return {"total_feedback": 0, "average_rating": 0, "style_preferences": {}}
            
        feedback = self.feedback_history[user_id]
        ratings = [f.get("rating", 0) for f in feedback if f.get("rating")]
        
        return {
            "total_feedback": len(feedback),
            "average_rating": sum(ratings) / len(ratings) if ratings else 0,
            "style_preferences": self.personas.get(user_id, {}).__dict__ if user_id in self.personas else {}
        }
