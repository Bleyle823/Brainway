# Runway ML Plugin for Hermes

A comprehensive Hermes plugin that integrates Runway ML's AI models for video generation, image creation, character sessions, audio generation, and media transformation.

## Features

- **Video Generation**: Create videos from text descriptions or images using Gen-4.5
- **Image Generation**: Generate images with optional reference/style transfer using gen4_image
- **Character Sessions**: Start real-time avatar conversations with gwm1_avatars
- **Audio Generation**: Create TTS, sound effects, dubbing, and speech conversion
- **Media Transformation**: Transform videos with gen4_aleph and act_two models
- **Bundled Skills**: Includes comprehensive creative workflow skill
- **CLI Commands**: Plugin management and model information
- **Monitoring**: Track usage and API status

## Installation

1. Copy this plugin directory to `~/.hermes/plugins/runway/`
2. Set your Runway API secret: `export RUNWAYML_API_SECRET=your_key_here`
3. Enable the plugin: `hermes plugins enable runway`
4. Restart Hermes

## Required Environment Variables

- `RUNWAYML_API_SECRET`: Your Runway org API secret from https://dev.runwayml.com

## Optional Environment Variables

- `RUNWAY_CHARACTER_AVATAR_ID`: Default avatar ID for character sessions
- `RUNWAY_CHARACTER_AVATAR_TYPE`: Avatar type (`runway-preset` or `custom`)
- `RUNWAYML_API_BASE_URL`: Custom API base URL (defaults to https://api.dev.runwayml.com/v1)

## Tools Available

### generate_video
Generate videos using Runway's Gen-4.5 model.

**Parameters:**
- `prompt_text` (required): Text description of the video
- `prompt_image` (optional): Image URL for image-to-video generation
- `ratio` (optional): Aspect ratio (default: 1280:720)
- `duration` (optional): Duration in seconds 2-10 (default: 5)

**Example:**
```
User: Create a video of a calm ocean at sunset, 8 seconds long
Assistant: I'll generate a video of a calm ocean at sunset for you.

[Calls generate_video with prompt_text="calm ocean at sunset, golden light reflecting on water, peaceful waves", duration=8]
```

### generate_image
Generate images using gen4_image with optional reference images.

**Parameters:**
- `prompt_text` (required): Text description of the image
- `ratio` (optional): Aspect ratio (default: 1920:1080)
- `reference_images` (optional): Array of reference images with URIs and tags

**Example:**
```
User: Generate an image of a modern office space in the style of a specific photo
Assistant: I'll create a modern office image with your reference style.

[Calls generate_image with appropriate parameters and reference]
```

### start_character_session
Create real-time character avatar sessions.

**Parameters:**
- `avatar_type` (optional): "runway-preset" or "custom"
- `avatar_id` (optional): Specific avatar ID
- `personality` (optional): Custom personality (custom avatars only)
- `start_script` (optional): Initial script (custom avatars only)

### generate_audio
Generate various types of audio content.

**Parameters:**
- `mode` (required): "tts", "sound", "dub", or "speech_to_speech"
- `text` (optional): Text for TTS or sound description
- `audio_uri` (optional): Input audio for dubbing/conversion
- `target_language` (optional): Target language for dubbing
- `voice_preset` (optional): Voice preset ID
- `duration` (optional): Duration for sound effects (1-22 seconds)

### transform_media
Transform videos and create character performances.

**Parameters:**
- `transform_type` (required): "video_to_video" or "character_performance"
- `input_video` (optional): Source video for transformation
- `prompt_text` (optional): Transformation description
- `character_uri` (optional): Character image for act_two
- `reference_uri` (optional): Reference performance video

## Commands

### Slash Commands (in chat)

- `/runway` - Show plugin status and recent activity

### CLI Commands (terminal)

- `hermes runway models` - List available Runway models
- `hermes runway ratios` - Show supported aspect ratios
- `hermes runway status` - Check plugin and API connectivity

## Bundled Skills

The plugin includes a comprehensive creative workflow skill:

```
skill_view("runway:runway-creative-workflow")
```

This skill provides detailed guidance for:
- Video creation workflows
- Image generation best practices
- Character session setup
- Audio production workflows
- Media transformation techniques
- Error handling and troubleshooting

## Usage Examples

### Creating a Product Demo Video

1. **Generate hero image:**
   ```
   User: Generate a product image - sleek smartphone on white background with studio lighting
   ```

2. **Create video from image:**
   ```
   User: Turn this image into a video with smooth rotation around the product, 6 seconds
   ```

3. **Add narration:**
   ```
   User: Create a TTS audio saying "Introducing our revolutionary smartphone with advanced AI capabilities"
   ```

### Interactive Character Session

```
User: Start a character session with a business professional avatar
Assistant: I'll create a character session with a professional avatar for you.

[Creates session and returns WebRTC credentials]

The session is ready! You can connect using:
- Server URL: wss://session.runwayml.com
- Token: eyJ... (credentials provided)
- Room: room_abc123

Use these credentials with a WebRTC client or @runwayml/avatars-react to connect.
```

### Creating Sound Effects

```
User: Generate a 10-second sound effect of gentle rain on leaves
Assistant: I'll create a peaceful rain sound effect for you.

[Generates audio and provides download URL]
```

## File Structure

```
~/.hermes/plugins/runway/
├── plugin.yaml           # Plugin manifest
├── __init__.py           # Registration and hooks
├── schemas.py            # Tool schemas for LLM
├── tools.py              # Tool handler implementations  
├── runway_client.py      # Runway API client
├── README.md             # This file
├── data/
│   └── models.yaml       # Model information and parameters
└── skills/
    └── runway-creative-workflow/
        └── SKILL.md      # Comprehensive workflow skill
```

## Error Handling

The plugin includes comprehensive error handling for:

- Missing API keys
- Network timeouts
- Invalid parameters
- API rate limits
- Task failures

All errors are returned as JSON with descriptive messages.

## Monitoring and Logging

- Tool calls are logged with duration and session info
- Recent activity is tracked (last 100 calls)
- Status commands show connectivity and usage
- Failed operations include detailed error information

## Requirements

- Python 3.7+
- `requests` library for HTTP calls
- `pyyaml` for data file loading
- Valid Runway ML Developer API account

## Support

For issues with the plugin:
1. Check `/runway` status for connectivity
2. Verify `RUNWAYML_API_SECRET` is set correctly
3. Check Hermes logs for detailed error messages
4. Ensure your Runway account has sufficient credits

For Runway API issues, consult the official documentation at https://docs.dev.runwayml.com/

## License

This plugin follows the same license as the Hermes project.