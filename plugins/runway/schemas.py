"""Tool schemas for Runway ML plugin - what the LLM sees."""

GENERATE_VIDEO = {
    "name": "generate_video",
    "description": (
        "Generate video using Runway's Gen-4.5 model. Supports both text-to-video "
        "and image-to-video generation. Can create videos from text descriptions or "
        "from a combination of text prompt and input image. Supports various aspect "
        "ratios and durations (2-10 seconds)."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "prompt_text": {
                "type": "string",
                "description": "Text description of the video to generate (e.g., 'a calm ocean at sunset')",
            },
            "prompt_image": {
                "type": "string",
                "description": "Optional URL or data URI of input image for image-to-video generation",
            },
            "ratio": {
                "type": "string",
                "description": "Aspect ratio: 1280:720, 720:1280, 1104:832, 960:960, 832:1104, or 1584:672",
                "default": "1280:720"
            },
            "duration": {
                "type": "integer",
                "description": "Video duration in seconds (2-10)",
                "minimum": 2,
                "maximum": 10,
                "default": 5
            },
        },
        "required": ["prompt_text"],
    },
}

GENERATE_IMAGE = {
    "name": "generate_image",
    "description": (
        "Generate images using Runway's gen4_image model. Supports text-to-image generation "
        "with optional reference images for style transfer or composition. Can use @tag "
        "mentions in prompts to reference specific images."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "prompt_text": {
                "type": "string",
                "description": "Text description of the image to generate",
            },
            "ratio": {
                "type": "string",
                "description": "Image aspect ratio (e.g., '1920:1080', '1280:720', '1024:1024')",
                "default": "1920:1080"
            },
            "reference_images": {
                "type": "array",
                "description": "Optional reference images for style transfer",
                "items": {
                    "type": "object",
                    "properties": {
                        "uri": {"type": "string", "description": "Image URL or data URI"},
                        "tag": {"type": "string", "description": "Tag name for @mentions in prompt"}
                    },
                    "required": ["uri"]
                }
            },
        },
        "required": ["prompt_text"],
    },
}

START_CHARACTER_SESSION = {
    "name": "start_character_session",
    "description": (
        "Create a Runway Characters real-time session for interactive avatar conversations. "
        "Returns WebRTC credentials for connecting to the live avatar session. Supports "
        "both preset and custom avatars with optional personality customization."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "avatar_type": {
                "type": "string",
                "description": "Type of avatar: 'runway-preset' or 'custom'",
                "enum": ["runway-preset", "custom"],
                "default": "runway-preset"
            },
            "avatar_id": {
                "type": "string",
                "description": "Avatar ID (preset ID for runway-preset, custom avatar ID for custom)",
            },
            "personality": {
                "type": "string",
                "description": "Custom personality description (only used with custom avatars)",
            },
            "start_script": {
                "type": "string",
                "description": "Initial script for the avatar to say (only used with custom avatars)",
            },
        },
        "required": [],
    },
}

GENERATE_AUDIO = {
    "name": "generate_audio",
    "description": (
        "Generate audio using Runway's ElevenLabs integration. Supports text-to-speech, "
        "sound effects generation, voice dubbing, and speech-to-speech conversion. "
        "Specify the mode and provide appropriate parameters."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "mode": {
                "type": "string",
                "description": "Audio generation mode",
                "enum": ["tts", "sound", "dub", "speech_to_speech"],
            },
            "text": {
                "type": "string",
                "description": "Text for TTS or sound effect description",
            },
            "audio_uri": {
                "type": "string",
                "description": "Input audio URL for dubbing or speech-to-speech",
            },
            "target_language": {
                "type": "string",
                "description": "Target language code for dubbing (e.g., 'es', 'fr', 'de')",
            },
            "voice_preset": {
                "type": "string",
                "description": "Voice preset ID for TTS or speech-to-speech",
            },
            "duration": {
                "type": "integer",
                "description": "Duration in seconds for sound effects (1-22)",
                "minimum": 1,
                "maximum": 22,
                "default": 3
            },
        },
        "required": ["mode"],
    },
}

TRANSFORM_MEDIA = {
    "name": "transform_media",
    "description": (
        "Transform media using Runway's advanced models. Supports video-to-video "
        "transformation with gen4_aleph and character performance with act_two. "
        "Can apply style changes, scene modifications, or character animations."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "transform_type": {
                "type": "string",
                "description": "Type of transformation",
                "enum": ["video_to_video", "character_performance"],
            },
            "input_video": {
                "type": "string",
                "description": "URL of input video to transform",
            },
            "prompt_text": {
                "type": "string",
                "description": "Text description of desired transformation",
            },
            "character_uri": {
                "type": "string",
                "description": "Character image/video URL for act_two performance",
            },
            "reference_uri": {
                "type": "string",
                "description": "Reference performance video URL for act_two",
            },
            "ratio": {
                "type": "string",
                "description": "Output aspect ratio",
                "default": "1280:720"
            },
        },
        "required": ["transform_type"],
    },
}