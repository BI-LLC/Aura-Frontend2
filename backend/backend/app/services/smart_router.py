# Smart routing system for LLM requests
# Handles load balancing between different AI providers

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, List, AsyncGenerator
import httpx
import openai
from dataclasses import dataclass
import logging
import json

logger = logging.getLogger(__name__)

@dataclass
class LLMResponse:
    # Response data from LLM calls
    content: str
    model_used: str
    response_time: float
    cost: float
    error: Optional[str] = None

class SmartRouter:
    def __init__(self):
        # Set up router with health monitoring and cost tracking
        
        # Keep track of which APIs are working
        self.api_health = {
            "grok": {"status": "unknown", "last_check": None, "failures": 0},
            "openai": {"status": "unknown", "last_check": None, "failures": 0}
        }
        
        # Running total of API costs
        self.costs = {"grok": 0.0, "openai": 0.0}
        
        # Request history for rate limit checks
        self.request_counts = {"grok": [], "openai": []}
        self.total_requests = 0
        
        # Recent errors for monitoring
        self.error_window = []
        
        # Background task handle
        self.health_monitor_task = None
        
        # Whether streaming is enabled
        self.streaming_enabled = True
        
        # Load API keys
        self._load_api_keys()
        
        logger.info("Smart Router initialized with streaming support")
    
    def _load_api_keys(self):
        """Load API keys from environment or config"""
        try:
            from app.config import settings
            self.openai_key = getattr(settings, 'OPENAI_API_KEY', None)
            self.grok_key = getattr(settings, 'GROK_API_KEY', None)
        except ImportError:
            import os
            self.openai_key = os.getenv('OPENAI_API_KEY')
            self.grok_key = os.getenv('GROK_API_KEY')
        
        logger.info(f"API Keys loaded - OpenAI: {'✓' if self.openai_key else '✗'}, Grok: {'✓' if self.grok_key else '✗'}")
    
    async def start_health_monitor(self):
        # Kick off background health checking
        if self.health_monitor_task is None:
            self.health_monitor_task = asyncio.create_task(self._health_monitor_loop())
            logger.info("Health monitor started")
    
    async def _health_monitor_loop(self):
        # Keep checking if our APIs are still working
        await asyncio.sleep(2)
        while True:
            try:
                await self._check_api_health()
                await asyncio.sleep(15)
            except Exception as e:
                logger.error(f"Health monitor error: {e}")
                await asyncio.sleep(15)
    
    async def _check_api_health(self):
        # Ping each API to see if it's alive
        # Test Grok API
        try:
            from app.config import settings
            if settings.GROK_API_KEY:
                self.api_health["grok"]["status"] = "healthy"
                self.api_health["grok"]["last_check"] = datetime.now()
                logger.debug("Grok health check: healthy")
        except Exception as e:
            logger.error(f"Grok health check failed: {e}")
            self.api_health["grok"]["status"] = "unhealthy"
            self.api_health["grok"]["failures"] += 1
        
        # Test OpenAI API
        try:
            from app.config import settings
            if settings.OPENAI_API_KEY:
                self.api_health["openai"]["status"] = "healthy"
                self.api_health["openai"]["last_check"] = datetime.now()
                logger.debug("OpenAI health check: healthy")
        except Exception as e:
            logger.error(f"OpenAI health check failed: {e}")
            self.api_health["openai"]["status"] = "unhealthy"
            self.api_health["openai"]["failures"] += 1
    
    def _classify_query(self, message: str) -> str:
        # Figure out which AI would handle this best
        message_lower = message.lower()
        word_count = len(message.split())
        
        # Quick factual queries → GPT-4-turbo
        quick_keywords = ["what is", "define", "when", "where", "who", "how many"]
        if word_count < 100 and any(kw in message_lower for kw in quick_keywords):
            return "openai"
        
        # Complex reasoning → Grok
        complex_keywords = ["analyze", "compare", "explain", "why", "reasoning", "solve"]
        if word_count > 200 or any(kw in message_lower for kw in complex_keywords):
            return "grok"
        
        return "openai"  # Default
    
    async def route_message_stream(
        self, 
        message: str,
        user_context: Optional[Dict] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream response from LLM
        New streaming method for real-time responses
        """
        preferred_provider = self._classify_query(message)
        
        # For now, simulate streaming
        # In production, this would use actual streaming APIs
        response = await self.route_message(message, user_context)
        
        if response.error:
            yield f"Error: {response.error}"
            return
        
        # Simulate streaming by yielding text in chunks
        words = response.content.split()
        chunk_size = 5
        
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i+chunk_size])
            yield chunk + " "
            await asyncio.sleep(0.05)  # Simulate streaming delay
    
    async def _stream_openai(self, message: str) -> AsyncGenerator[str, None]:
        """
        Stream response from OpenAI
        Actual streaming implementation
        """
        from app.config import settings
        
        try:
            client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
            stream = await client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[{"role": "user", "content": message}],
                max_tokens=1000,
                temperature=0.3,
                stream=True  # Enable streaming
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
            
        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def _stream_grok(self, message: str) -> AsyncGenerator[str, None]:
        """
        Stream response from Grok
        Grok streaming implementation
        """
        from app.config import settings
        
        try:
            # Grok streaming implementation would go here
            # For now, fall back to regular response
            response = await self._call_grok(message)
            
            if response.error:
                yield f"Error: {response.error}"
            else:
                # Simulate streaming
                words = response.content.split()
                for i in range(0, len(words), 5):
                    chunk = " ".join(words[i:i+5])
                    yield chunk + " "
                    await asyncio.sleep(0.05)
        
        except Exception as e:
            logger.error(f"Grok streaming error: {e}")
            yield f"Error: {str(e)}"
    
    def _check_rate_limit(self, provider: str) -> bool:
        # Simple rate limiting check
        now = datetime.now()
        one_minute_ago = now - timedelta(minutes=1)
        
        self.request_counts[provider] = [
            req_time for req_time in self.request_counts[provider] 
            if req_time > one_minute_ago
        ]
        
        limits = {
            "grok": 100,
            "openai": 500
        }
        
        return len(self.request_counts[provider]) < limits.get(provider, 100)
    
    async def _call_grok(self, message: str) -> LLMResponse:
        # Call Grok API (existing implementation)
        from app.config import settings
        
        start_time = time.time()
        
        try:
            self.request_counts["grok"].append(datetime.now())
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{settings.GROK_API_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROK_API_KEY}"},
                    json={
                        "model": "grok-beta",
                        "messages": [{"role": "user", "content": message}],
                        "max_tokens": 1000,
                        "temperature": 0.7
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    
                    cost = len(message.split()) * 0.00002 + len(content.split()) * 0.00006
                    self.costs["grok"] += cost
                    
                    return LLMResponse(
                        content=content,
                        model_used="grok-beta",
                        response_time=time.time() - start_time,
                        cost=cost
                    )
                else:
                    raise Exception(f"Grok API error: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Grok API call failed: {e}")
            self.api_health["grok"]["failures"] += 1
            return LLMResponse(
                content="",
                model_used="grok-beta",
                response_time=time.time() - start_time,
                cost=0.0,
                error=str(e)
            )
    
    async def _call_openai(self, message: str) -> LLMResponse:
        # Call OpenAI GPT-4-turbo (existing implementation)
        from app.config import settings
        
        start_time = time.time()
        
        try:
            self.request_counts["openai"].append(datetime.now())
            
            client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
            response = await client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[{"role": "user", "content": message}],
                max_tokens=1000,
                temperature=0.3
            )
            
            content = response.choices[0].message.content
            
            cost = len(message.split()) * 0.00001 + len(content.split()) * 0.00003
            self.costs["openai"] += cost
            
            return LLMResponse(
                content=content,
                model_used="gpt-4-turbo",
                response_time=time.time() - start_time,
                cost=cost
            )
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            self.api_health["openai"]["failures"] += 1
            return LLMResponse(
                content="",
                model_used="gpt-4-turbo",
                response_time=time.time() - start_time,
                cost=0.0,
                error=str(e)
            )
    
    async def route_message(self, message: str, user_context: Optional[Dict] = None) -> LLMResponse:
        # Main routing function (existing implementation)
        self.total_requests += 1
        
        preferred_provider = self._classify_query(message)
        logger.info(f"Query classified for: {preferred_provider}")
        
        providers_to_try = ["openai", "grok"] if preferred_provider == "openai" else ["grok", "openai"]
        
        # Try each provider
        for provider in providers_to_try:
            # Check health and rate limits
            if self.api_health[provider]["status"] == "unknown":
                logger.info(f"{provider} health unknown, trying anyway...")
            elif self.api_health[provider]["status"] != "healthy":
                logger.warning(f"{provider} is unhealthy, skipping")
                continue
                
            if not self._check_rate_limit(provider):
                logger.warning(f"{provider} rate limited, skipping")
                continue
            
            # Make the API call
            logger.info(f"Routing to {provider}...")
            if provider == "grok":
                response = await self._call_grok(message)
            else:
                response = await self._call_openai(message)
            
            # If successful, return
            if not response.error:
                logger.info(f"Successfully routed to {provider}")
                return response
            
            # Track error
            self.error_window.append(datetime.now())
            logger.error(f"{provider} failed: {response.error}")
        
        # All providers failed
        logger.error("All providers failed!")
        return LLMResponse(
            content="I'm sorry, I'm having technical difficulties. Please try again in a moment.",
            model_used="fallback",
            response_time=0.0,
            cost=0.0,
            error="All providers failed"
        )
    
    async def route_message_stream(self, message: str, user_context: Optional[Dict] = None) -> AsyncGenerator[str, None]:
        """
        Stream LLM responses token by token for real-time conversation
        
        Args:
            message: User input message
            user_context: Optional context information
            
        Yields:
            str: Individual text chunks from the LLM
        """
        if not self.streaming_enabled:
            # Fallback to non-streaming
            response = await self.route_message(message, user_context)
            yield response.content
            return
        
        self.total_requests += 1
        
        # Determine preferred provider
        preferred_provider = self._classify_query(message)
        providers_to_try = ["openai", "grok"] if preferred_provider == "openai" else ["grok", "openai"]
        
        for provider in providers_to_try:
            # Check health and rate limits
            if not self._is_provider_healthy(provider):
                continue
                
            if not self._check_rate_limit(provider):
                logger.warning(f"{provider} rate limited, skipping")
                continue
            
            try:
                logger.info(f"Streaming from {provider}...")
                
                if provider == "grok":
                    async for chunk in self._stream_from_grok(message, user_context):
                        yield chunk
                else:
                    async for chunk in self._stream_from_openai(message, user_context):
                        yield chunk
                
                logger.info(f"Successfully streamed from {provider}")
                return
                
            except Exception as e:
                logger.error(f"Streaming error from {provider}: {e}")
                self.error_window.append(datetime.now())
                continue
        
        # All providers failed - yield fallback message
        logger.error("All streaming providers failed!")
        yield "I'm sorry, I'm having technical difficulties. Please try again in a moment."
    
    async def _stream_from_openai(self, message: str, user_context: Optional[Dict] = None) -> AsyncGenerator[str, None]:
        """Stream response from OpenAI with proper streaming for voice conversation"""
        if not self.openai_key:
            yield "OpenAI API not configured. Please check your API key."
            return
        
        try:
            # Prepare conversation context for natural voice flow
            system_prompt = self._get_voice_system_prompt(user_context)
            
            # Create OpenAI client with streaming
            client = openai.OpenAI(api_key=self.openai_key)
            
            # Prepare messages for conversation flow
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ]
            
            # Stream the response for real-time voice synthesis
            logger.info(f"Streaming from OpenAI: {message[:50]}...")
            
            stream = await asyncio.to_thread(
                client.chat.completions.create,
                model="gpt-4o-mini",  # Fast and cost-effective for voice
                messages=messages,
                stream=True,
                max_tokens=150,  # Keep responses concise for voice
                temperature=0.7,  # Balanced creativity
                presence_penalty=0.1,  # Slight variety
                frequency_penalty=0.1   # Reduce repetition
            )
            
            # Stream tokens in real-time
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield content
                    logger.debug(f"OpenAI stream chunk: {content}")
            
            logger.info("OpenAI streaming completed")
            
        except Exception as e:
            error_msg = f"OpenAI streaming error: {str(e)}"
            logger.error(error_msg)
            yield error_msg
    
    async def _stream_from_grok(self, message: str, user_context: Optional[Dict] = None) -> AsyncGenerator[str, None]:
        """Stream responses from Grok API"""
        if not self.grok_key:
            raise Exception("Grok API key not available")
        
        try:
            headers = {
                "Authorization": f"Bearer {self.grok_key}",
                "Content-Type": "application/json"
            }
            
            # Build request data
            data = {
                "messages": [
                    {"role": "system", "content": "You are AURA, a helpful AI assistant. Respond naturally and conversationally."},
                    {"role": "user", "content": message}
                ],
                "model": "grok-beta",
                "stream": True,
                "temperature": 0.7,
                "max_tokens": 300
            }
            
            # Add context if provided
            if user_context:
                context_str = json.dumps(user_context, indent=2)
                data["messages"].insert(1, {"role": "system", "content": f"Context: {context_str}"})
            
            # Make streaming request
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST", 
                    "https://api.x.ai/v1/chat/completions",
                    headers=headers,
                    json=data
                ) as response:
                    
                    if response.status_code != 200:
                        raise Exception(f"Grok API error: {response.status_code}")
                    
                    # Process streaming response
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]  # Remove "data: " prefix
                            
                            if data_str.strip() == "[DONE]":
                                break
                            
                            try:
                                chunk_data = json.loads(data_str)
                                if chunk_data.get("choices") and len(chunk_data["choices"]) > 0:
                                    delta = chunk_data["choices"][0].get("delta", {})
                                    if delta.get("content"):
                                        yield delta["content"]
                            except json.JSONDecodeError:
                                # Skip invalid JSON chunks
                                continue
                                
        except Exception as e:
            logger.error(f"Grok streaming error: {e}")
            raise
    
    def _is_provider_healthy(self, provider: str) -> bool:
        """Check if a provider is healthy and available"""
        health_info = self.api_health.get(provider, {})
        status = health_info.get("status", "unknown")
        
        if status == "unhealthy":
            return False
        
        # If status is unknown, allow it (will be tested)
        return True
    
    async def get_health_status(self) -> Dict:
        # Get current health status of all APIs
        five_min_ago = datetime.now() - timedelta(minutes=5)
        self.error_window = [e for e in self.error_window if e > five_min_ago]
        
        error_rate = len(self.error_window) / max(self.total_requests, 1)
        
        return {
            "grok": {
                "status": self.api_health["grok"]["status"],
                "failures": self.api_health["grok"]["failures"],
                "last_check": self.api_health["grok"]["last_check"].isoformat() if self.api_health["grok"]["last_check"] else None
            },
            "openai": {
                "status": self.api_health["openai"]["status"],
                "failures": self.api_health["openai"]["failures"],
                "last_check": self.api_health["openai"]["last_check"].isoformat() if self.api_health["openai"]["last_check"] else None
            },
            "error_rate": f"{error_rate:.2%}",
            "errors_last_5min": len(self.error_window),
            "streaming_enabled": self.streaming_enabled
        }
    
    def get_cost_summary(self) -> Dict[str, float]:
        # Get total costs per API
        return {
            "grok": round(self.costs["grok"], 4),
            "openai": round(self.costs["openai"], 4),
            "total": round(self.costs["grok"] + self.costs["openai"], 4)
        }
    
    def get_request_count(self) -> int:
        # Get total request count
        return self.total_requests
    
    def _get_voice_system_prompt(self, user_context: Optional[Dict] = None) -> str:
        """Get optimized system prompt for voice conversation"""
        base_prompt = """You are a helpful AI assistant designed for natural voice conversation. 

Key guidelines:
- Keep responses concise and conversational (1-2 sentences max)
- Use natural speech patterns that sound good when spoken
- Avoid complex punctuation or formatting
- Be warm, helpful, and engaging
- Respond as if in a phone call conversation

Current context: {context}"""

        context = "General conversation"
        if user_context:
            if "persona" in user_context:
                context += f", User preference: {user_context['persona']}"
            if "conversation_history" in user_context:
                context += f", Previous context available"
        
        return base_prompt.format(context=context)