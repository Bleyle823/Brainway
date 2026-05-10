"""Runway API client implementation."""

import json
import os
import time
from typing import Dict, Any, Optional, List
import requests


class RunwayClient:
    """Client for Runway Developer API."""
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.environ.get('RUNWAYML_API_SECRET')
        self.base_url = base_url or os.environ.get('RUNWAYML_API_BASE_URL', 'https://api.dev.runwayml.com/v1')
        self.version = '2024-11-06'
        
        if not self.api_key:
            raise ValueError("RUNWAYML_API_SECRET is required")
    
    def _headers(self, use_session_key: bool = False, session_key: str = None) -> Dict[str, str]:
        """Get request headers."""
        key = session_key if use_session_key else self.api_key
        return {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'X-Runway-Version': self.version,
        }
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None, 
                     use_session_key: bool = False, session_key: str = None) -> Dict:
        """Make HTTP request to Runway API."""
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        headers = self._headers(use_session_key, session_key)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise RuntimeError(f"Runway API request failed: {e}")
    
    def start_gen45_video(self, prompt_text: str, prompt_image: str = None, 
                         ratio: str = '1280:720', duration: int = 5) -> str:
        """Start Gen-4.5 video generation."""
        data = {
            'model': 'gen4.5',
            'promptText': prompt_text,
            'ratio': ratio,
            'duration': duration,
        }
        if prompt_image:
            data['promptImage'] = prompt_image
        
        result = self._make_request('POST', 'image_to_video', data)
        return result['id']
    
    def start_gen4_image(self, prompt_text: str, ratio: str = '1920:1080',
                        reference_images: List[Dict] = None) -> str:
        """Start gen4_image generation."""
        data = {
            'model': 'gen4_image',
            'promptText': prompt_text,
            'ratio': ratio,
        }
        if reference_images:
            data['referenceImages'] = reference_images
        
        result = self._make_request('POST', 'text_to_image', data)
        return result['id']
    
    def start_video_to_video(self, prompt_video: str, prompt_text: str,
                           ratio: str = '1280:720') -> str:
        """Start gen4_aleph video-to-video transformation."""
        data = {
            'model': 'gen4_aleph',
            'promptVideo': prompt_video,
            'promptText': prompt_text,
            'ratio': ratio,
        }
        
        result = self._make_request('POST', 'video_to_video', data)
        return result['id']
    
    def start_character_performance(self, character_uri: str, reference_uri: str,
                                  ratio: str = '1280:720') -> str:
        """Start act_two character performance."""
        data = {
            'model': 'act_two',
            'character': {'type': 'image', 'uri': character_uri},
            'reference': {'type': 'video', 'uri': reference_uri},
            'ratio': ratio,
        }
        
        result = self._make_request('POST', 'character_performance', data)
        return result['id']
    
    def start_sound_effect(self, prompt_text: str, duration: int = 3) -> str:
        """Start sound effect generation."""
        data = {
            'model': 'eleven_text_to_sound_v2',
            'promptText': prompt_text,
            'duration': duration,
        }
        
        result = self._make_request('POST', 'sound_effect', data)
        return result['id']
    
    def start_text_to_speech(self, text: str, voice_preset: str = None) -> str:
        """Start text-to-speech generation."""
        data = {
            'model': 'eleven_multilingual_v2',
            'promptText': text,
        }
        if voice_preset:
            data['voice'] = {'type': 'runway-preset', 'presetId': voice_preset}
        
        result = self._make_request('POST', 'text_to_speech', data)
        return result['id']
    
    def start_voice_dubbing(self, audio_uri: str, target_lang: str = 'es') -> str:
        """Start voice dubbing."""
        data = {
            'model': 'eleven_voice_dubbing',
            'audioUri': audio_uri,
            'targetLang': target_lang,
        }
        
        result = self._make_request('POST', 'voice_dubbing', data)
        return result['id']
    
    def start_speech_to_speech(self, media_uri: str, voice_preset: str = 'English_CalmMale') -> str:
        """Start speech-to-speech conversion."""
        data = {
            'model': 'eleven_multilingual_sts_v2',
            'media': {'type': 'audio', 'uri': media_uri},
            'voice': {'type': 'runway-preset', 'presetId': voice_preset},
        }
        
        result = self._make_request('POST', 'speech_to_speech', data)
        return result['id']
    
    def get_task(self, task_id: str) -> Dict:
        """Get task status and results."""
        return self._make_request('GET', f'tasks/{task_id}')
    
    def wait_for_task(self, task_id: str, timeout: int = 900, poll_interval: int = 3) -> Dict:
        """Wait for task completion with polling."""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            task = self.get_task(task_id)
            status = task.get('status')
            
            if status == 'SUCCEEDED':
                return task
            elif status in ('FAILED', 'CANCELLED'):
                raise RuntimeError(f"Task {task_id} failed: {task.get('failure', status)}")
            elif status in ('PENDING', 'RUNNING', 'THROTTLED'):
                time.sleep(poll_interval)
            else:
                raise RuntimeError(f"Unknown task status: {status}")
        
        raise TimeoutError(f"Task {task_id} timed out after {timeout} seconds")
    
    # Character/Realtime session methods
    def create_realtime_session(self, avatar_type: str = 'runway-preset',
                               avatar_id: str = None, personality: str = None,
                               start_script: str = None) -> str:
        """Create a realtime character session."""
        # Default avatar if none specified
        if not avatar_id:
            avatar_id = os.environ.get('RUNWAY_CHARACTER_AVATAR_ID', 'music-superstar')
        
        avatar_config = {
            'type': avatar_type,
        }
        
        if avatar_type == 'runway-preset':
            avatar_config['presetId'] = avatar_id
        else:
            avatar_config['avatarId'] = avatar_id
        
        data = {
            'model': 'gwm1_avatars',
            'avatar': avatar_config,
        }
        
        # Only add personality and start_script for custom avatars
        if avatar_type == 'custom':
            if personality:
                data['personality'] = personality
            if start_script:
                data['startScript'] = start_script
        
        result = self._make_request('POST', 'realtime_sessions', data)
        return result['id']
    
    def get_realtime_session(self, session_id: str) -> Dict:
        """Get realtime session status."""
        return self._make_request('GET', f'realtime_sessions/{session_id}')
    
    def wait_for_session_ready(self, session_id: str, timeout: int = 120) -> str:
        """Wait for realtime session to be ready and return session key."""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            session = self.get_realtime_session(session_id)
            status = session.get('status')
            
            if status == 'READY' and session.get('sessionKey'):
                return session['sessionKey']
            elif status in ('FAILED', 'CANCELLED'):
                raise RuntimeError(f"Session {session_id} failed: {session.get('failure', status)}")
            
            time.sleep(2)
        
        raise TimeoutError(f"Session {session_id} timed out waiting for READY status")
    
    def consume_realtime_session(self, session_id: str, session_key: str) -> Dict:
        """Consume realtime session to get WebRTC credentials."""
        return self._make_request('POST', f'realtime_sessions/{session_id}/consume',
                                use_session_key=True, session_key=session_key)