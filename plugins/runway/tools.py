"""Tool handlers for Runway ML plugin - the code that runs when the LLM calls each tool."""

import json
import logging
from typing import Dict, Any
from .runway_client import RunwayClient

logger = logging.getLogger(__name__)


def generate_video(args: Dict[str, Any], **kwargs) -> str:
    """Generate video using Runway Gen-4.5."""
    try:
        client = RunwayClient()
        
        prompt_text = args.get('prompt_text', '').strip()
        if not prompt_text:
            return json.dumps({"error": "prompt_text is required"})
        
        prompt_image = args.get('prompt_image')
        ratio = args.get('ratio', '1280:720')
        duration = args.get('duration', 5)
        
        # Validate duration
        if not (2 <= duration <= 10):
            return json.dumps({"error": "duration must be between 2 and 10 seconds"})
        
        logger.info(f"Starting video generation: {prompt_text[:50]}...")
        
        # Start the task
        task_id = client.start_gen45_video(
            prompt_text=prompt_text,
            prompt_image=prompt_image,
            ratio=ratio,
            duration=duration
        )
        
        # Wait for completion
        task = client.wait_for_task(task_id)
        
        if task['status'] == 'SUCCEEDED' and task.get('output'):
            video_url = task['output'][0]
            return json.dumps({
                "success": True,
                "task_id": task_id,
                "video_url": video_url,
                "prompt": prompt_text,
                "duration": duration,
                "ratio": ratio
            })
        else:
            return json.dumps({
                "error": f"Video generation failed: {task.get('failure', 'Unknown error')}",
                "task_id": task_id
            })
            
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        return json.dumps({"error": f"Video generation failed: {str(e)}"})


def generate_image(args: Dict[str, Any], **kwargs) -> str:
    """Generate image using Runway gen4_image."""
    try:
        client = RunwayClient()
        
        prompt_text = args.get('prompt_text', '').strip()
        if not prompt_text:
            return json.dumps({"error": "prompt_text is required"})
        
        ratio = args.get('ratio', '1920:1080')
        reference_images = args.get('reference_images', [])
        
        logger.info(f"Starting image generation: {prompt_text[:50]}...")
        
        # Start the task
        task_id = client.start_gen4_image(
            prompt_text=prompt_text,
            ratio=ratio,
            reference_images=reference_images if reference_images else None
        )
        
        # Wait for completion
        task = client.wait_for_task(task_id)
        
        if task['status'] == 'SUCCEEDED' and task.get('output'):
            image_url = task['output'][0]
            return json.dumps({
                "success": True,
                "task_id": task_id,
                "image_url": image_url,
                "prompt": prompt_text,
                "ratio": ratio,
                "reference_count": len(reference_images)
            })
        else:
            return json.dumps({
                "error": f"Image generation failed: {task.get('failure', 'Unknown error')}",
                "task_id": task_id
            })
            
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        return json.dumps({"error": f"Image generation failed: {str(e)}"})


def start_character_session(args: Dict[str, Any], **kwargs) -> str:
    """Start a Runway Characters realtime session."""
    try:
        client = RunwayClient()
        
        avatar_type = args.get('avatar_type', 'runway-preset')
        avatar_id = args.get('avatar_id')
        personality = args.get('personality')
        start_script = args.get('start_script')
        
        logger.info(f"Creating character session with {avatar_type} avatar...")
        
        # Create the session
        session_id = client.create_realtime_session(
            avatar_type=avatar_type,
            avatar_id=avatar_id,
            personality=personality,
            start_script=start_script
        )
        
        # Wait for session to be ready
        session_key = client.wait_for_session_ready(session_id)
        
        # Get WebRTC credentials
        credentials = client.consume_realtime_session(session_id, session_key)
        
        return json.dumps({
            "success": True,
            "session_id": session_id,
            "credentials": {
                "server_url": credentials.get('url'),
                "token": credentials.get('token'),
                "room_name": credentials.get('roomName')
            },
            "avatar_type": avatar_type,
            "avatar_id": avatar_id,
            "instructions": "Use the credentials with @runwayml/avatars-react or WebRTC client to connect to the live avatar session."
        })
        
    except Exception as e:
        logger.error(f"Character session error: {e}")
        return json.dumps({"error": f"Character session failed: {str(e)}"})


def generate_audio(args: Dict[str, Any], **kwargs) -> str:
    """Generate audio using Runway's ElevenLabs integration."""
    try:
        client = RunwayClient()
        
        mode = args.get('mode')
        if not mode:
            return json.dumps({"error": "mode is required (tts, sound, dub, speech_to_speech)"})
        
        logger.info(f"Starting audio generation in {mode} mode...")
        
        task_id = None
        
        if mode == 'tts':
            text = args.get('text', '').strip()
            if not text:
                return json.dumps({"error": "text is required for TTS mode"})
            
            voice_preset = args.get('voice_preset')
            task_id = client.start_text_to_speech(text, voice_preset)
            
        elif mode == 'sound':
            text = args.get('text', '').strip()
            if not text:
                return json.dumps({"error": "text is required for sound mode"})
            
            duration = args.get('duration', 3)
            if not (1 <= duration <= 22):
                return json.dumps({"error": "duration must be between 1 and 22 seconds"})
            
            task_id = client.start_sound_effect(text, duration)
            
        elif mode == 'dub':
            audio_uri = args.get('audio_uri', '').strip()
            if not audio_uri:
                return json.dumps({"error": "audio_uri is required for dubbing mode"})
            
            target_language = args.get('target_language', 'es')
            task_id = client.start_voice_dubbing(audio_uri, target_language)
            
        elif mode == 'speech_to_speech':
            audio_uri = args.get('audio_uri', '').strip()
            if not audio_uri:
                return json.dumps({"error": "audio_uri is required for speech-to-speech mode"})
            
            voice_preset = args.get('voice_preset', 'English_CalmMale')
            task_id = client.start_speech_to_speech(audio_uri, voice_preset)
            
        else:
            return json.dumps({"error": f"Unsupported mode: {mode}"})
        
        # Wait for completion
        task = client.wait_for_task(task_id)
        
        if task['status'] == 'SUCCEEDED' and task.get('output'):
            audio_url = task['output'][0]
            return json.dumps({
                "success": True,
                "task_id": task_id,
                "audio_url": audio_url,
                "mode": mode,
                "parameters": {k: v for k, v in args.items() if k != 'mode'}
            })
        else:
            return json.dumps({
                "error": f"Audio generation failed: {task.get('failure', 'Unknown error')}",
                "task_id": task_id,
                "mode": mode
            })
            
    except Exception as e:
        logger.error(f"Audio generation error: {e}")
        return json.dumps({"error": f"Audio generation failed: {str(e)}"})


def transform_media(args: Dict[str, Any], **kwargs) -> str:
    """Transform media using Runway's advanced models."""
    try:
        client = RunwayClient()
        
        transform_type = args.get('transform_type')
        if not transform_type:
            return json.dumps({"error": "transform_type is required (video_to_video, character_performance)"})
        
        logger.info(f"Starting media transformation: {transform_type}")
        
        task_id = None
        
        if transform_type == 'video_to_video':
            input_video = args.get('input_video', '').strip()
            prompt_text = args.get('prompt_text', '').strip()
            
            if not input_video or not prompt_text:
                return json.dumps({"error": "input_video and prompt_text are required for video_to_video"})
            
            ratio = args.get('ratio', '1280:720')
            task_id = client.start_video_to_video(input_video, prompt_text, ratio)
            
        elif transform_type == 'character_performance':
            character_uri = args.get('character_uri', '').strip()
            reference_uri = args.get('reference_uri', '').strip()
            
            if not character_uri or not reference_uri:
                return json.dumps({"error": "character_uri and reference_uri are required for character_performance"})
            
            ratio = args.get('ratio', '1280:720')
            task_id = client.start_character_performance(character_uri, reference_uri, ratio)
            
        else:
            return json.dumps({"error": f"Unsupported transform_type: {transform_type}"})
        
        # Wait for completion
        task = client.wait_for_task(task_id)
        
        if task['status'] == 'SUCCEEDED' and task.get('output'):
            output_url = task['output'][0]
            return json.dumps({
                "success": True,
                "task_id": task_id,
                "output_url": output_url,
                "transform_type": transform_type,
                "parameters": {k: v for k, v in args.items() if k != 'transform_type'}
            })
        else:
            return json.dumps({
                "error": f"Media transformation failed: {task.get('failure', 'Unknown error')}",
                "task_id": task_id,
                "transform_type": transform_type
            })
            
    except Exception as e:
        logger.error(f"Media transformation error: {e}")
        return json.dumps({"error": f"Media transformation failed: {str(e)}"})