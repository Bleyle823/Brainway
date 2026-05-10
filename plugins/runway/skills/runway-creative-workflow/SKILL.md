# Runway Creative Workflow

A comprehensive skill for creating multimedia content using Runway ML's AI models. This skill guides you through video generation, image creation, character sessions, and media transformations.

## Usage

Load with: `skill_view("runway:runway-creative-workflow")`

## Capabilities

- **Video Generation**: Create videos from text descriptions or images
- **Image Creation**: Generate images with optional style references  
- **Character Sessions**: Start interactive avatar conversations
- **Audio Generation**: Create TTS, sound effects, and voice transformations
- **Media Transformation**: Transform videos with style changes or character performances

## Workflow Steps

### 1. Video Creation Workflow

For creating videos from scratch:

1. **Plan your video concept**
   - Define the scene, mood, and visual style
   - Consider aspect ratio (landscape 1280:720, portrait 720:1280, square 960:960)
   - Choose duration (2-10 seconds)

2. **Generate the video**
   ```
   generate_video(prompt_text="your scene description", ratio="1280:720", duration=5)
   ```

3. **For image-to-video**
   - Start with an image (generate_image or provide URL)
   - Use the image as input: `prompt_image="image_url"`

### 2. Image Creation Workflow

For generating images:

1. **Craft detailed prompts**
   - Be specific about style, lighting, composition
   - Use reference images for style transfer when needed

2. **Generate with references (optional)**
   ```
   generate_image(
     prompt_text="@style a modern office space", 
     reference_images=[{"uri": "style_image_url", "tag": "style"}]
   )
   ```

### 3. Character Session Workflow

For interactive avatar experiences:

1. **Choose avatar type**
   - `runway-preset`: Use built-in avatars (music-superstar, etc.)
   - `custom`: Use your own avatar with personality

2. **Start session**
   ```
   start_character_session(
     avatar_type="runway-preset",
     avatar_id="music-superstar"
   )
   ```

3. **Connect to session**
   - Use returned WebRTC credentials with frontend client
   - Requires @runwayml/avatars-react or WebRTC implementation

### 4. Audio Production Workflow

For creating audio content:

1. **Choose audio type**
   - `tts`: Text-to-speech conversion
   - `sound`: Sound effects generation
   - `dub`: Voice dubbing to another language
   - `speech_to_speech`: Voice conversion

2. **Generate audio**
   ```
   generate_audio(mode="tts", text="Hello, welcome to our presentation")
   generate_audio(mode="sound", text="gentle rain on window", duration=10)
   ```

### 5. Media Transformation Workflow

For transforming existing content:

1. **Video-to-video transformation**
   ```
   transform_media(
     transform_type="video_to_video",
     input_video="source_video_url", 
     prompt_text="make it look cinematic with film grain"
   )
   ```

2. **Character performance (act_two)**
   ```
   transform_media(
     transform_type="character_performance",
     character_uri="character_image_url",
     reference_uri="performance_video_url"
   )
   ```

## Best Practices

### Video Generation Tips
- Use descriptive, visual language
- Specify camera movements: "slow zoom in", "panning shot"
- Include lighting details: "golden hour lighting", "soft studio lighting"
- Mention style: "cinematic", "documentary style", "artistic"

### Image Generation Tips  
- Layer details: subject + environment + style + lighting
- Use @tag references for consistent style application
- Experiment with aspect ratios for different use cases
- Combine multiple reference images for complex styles

### Audio Generation Tips
- For TTS: Use natural punctuation and pacing
- For sound effects: Be specific about intensity and character
- For dubbing: Ensure source audio is clear
- Consider voice presets for different emotions/styles

### Character Session Tips
- Custom avatars allow personality customization
- Preset avatars have built-in personalities  
- Start scripts work only with custom avatars
- Session credentials are temporary - use immediately

## Error Handling

Common issues and solutions:

1. **Missing API Key**: Set `RUNWAYML_API_SECRET` environment variable
2. **Task Timeouts**: Large or complex generations may take 10-15 minutes
3. **Invalid Ratios**: Use supported aspect ratios for each model
4. **File Access**: Ensure URLs are publicly accessible
5. **Session Failures**: Character sessions may take 1-2 minutes to initialize

## Integration with Other Tools

Combine with other Hermes capabilities:

- **File tools**: Save generated content locally
- **Web tools**: Research visual references and styles  
- **Terminal**: Process media files with ffmpeg or similar
- **Code tools**: Build applications using Runway APIs
- **Communication**: Share results in channels or notifications

## Example Complete Workflow

Creating a product demo video:

1. **Generate hero image**
   ```
   generate_image(prompt_text="modern tech product on clean white background, studio lighting")
   ```

2. **Create video from image**  
   ```
   generate_video(prompt_text="smooth rotation around product, professional lighting", prompt_image="hero_image_url", duration=8)
   ```

3. **Add narration**
   ```
   generate_audio(mode="tts", text="Introducing our revolutionary new product...", voice_preset="Professional_Male")
   ```

4. **Transform for different styles**
   ```
   transform_media(transform_type="video_to_video", input_video="product_video_url", prompt_text="add subtle motion graphics and brand colors")
   ```

This workflow produces a complete multimedia package ready for marketing use.

## Monitoring and Status

Use `/runway` command to check plugin status and recent activity.

Track your usage to stay within API limits and optimize generation parameters.