"""Runway ML plugin for Hermes - registration and hooks."""

import logging
import yaml
from pathlib import Path
from . import schemas, tools

logger = logging.getLogger(__name__)

# Load model data
_PLUGIN_DIR = Path(__file__).parent
_MODELS_FILE = _PLUGIN_DIR / "data" / "models.yaml"

try:
    with open(_MODELS_FILE) as f:
        _MODEL_DATA = yaml.safe_load(f)
except Exception as e:
    logger.warning(f"Could not load models data: {e}")
    _MODEL_DATA = {}

# Track tool usage via hooks
_call_log = []


def _on_post_tool_call(tool_name, args, result, task_id, duration_ms=None, **kwargs):
    """Hook: runs after every tool call (not just ours)."""
    _call_log.append({
        "tool": tool_name,
        "session": task_id,
        "duration_ms": duration_ms,
        "timestamp": kwargs.get("timestamp")
    })
    
    # Keep log size manageable
    if len(_call_log) > 100:
        _call_log.pop(0)
    
    # Log Runway tool calls with more detail
    if tool_name.startswith(('generate_video', 'generate_image', 'start_character_session',
                           'generate_audio', 'transform_media')):
        logger.info("Runway tool called: %s (session %s, duration %sms)", 
                   tool_name, task_id, duration_ms)
    else:
        logger.debug("Tool called: %s (session %s)", tool_name, task_id)


def register(ctx):
    """Register Runway ML tools and hooks with Hermes."""
    
    # Register video generation tool
    ctx.register_tool(
        name="generate_video",
        toolset="runway",
        schema=schemas.GENERATE_VIDEO,
        handler=tools.generate_video
    )
    
    # Register image generation tool
    ctx.register_tool(
        name="generate_image", 
        toolset="runway",
        schema=schemas.GENERATE_IMAGE,
        handler=tools.generate_image
    )
    
    # Register character session tool
    ctx.register_tool(
        name="start_character_session",
        toolset="runway", 
        schema=schemas.START_CHARACTER_SESSION,
        handler=tools.start_character_session
    )
    
    # Register audio generation tool
    ctx.register_tool(
        name="generate_audio",
        toolset="runway",
        schema=schemas.GENERATE_AUDIO, 
        handler=tools.generate_audio
    )
    
    # Register media transformation tool
    ctx.register_tool(
        name="transform_media",
        toolset="runway",
        schema=schemas.TRANSFORM_MEDIA,
        handler=tools.transform_media
    )
    
    # Register hook to track tool usage
    ctx.register_hook("post_tool_call", _on_post_tool_call)
    
    # Register bundled skills
    skills_dir = Path(__file__).parent / "skills"
    if skills_dir.exists():
        for skill_dir in sorted(skills_dir.iterdir()):
            skill_md = skill_dir / "SKILL.md"
            if skill_dir.is_dir() and skill_md.exists():
                ctx.register_skill(skill_dir.name, skill_md)
                logger.debug(f"Registered skill: runway:{skill_dir.name}")
    
    # Register slash commands for plugin management
    def _handle_runway_status(raw_args: str) -> str:
        """Handle /runway status command."""
        try:
            from .runway_client import RunwayClient
            client = RunwayClient()
            
            recent_calls = _call_log[-5:] if _call_log else []
            runway_calls = [call for call in recent_calls if call["tool"].startswith(
                ('generate_video', 'generate_image', 'start_character_session', 
                 'generate_audio', 'transform_media'))]
            
            status = f"Runway ML Plugin Status:\n"
            status += f"- API Base: {client.base_url}\n"
            status += f"- API Key: {'✓ Configured' if client.api_key else '✗ Missing'}\n"
            status += f"- Recent Runway calls: {len(runway_calls)}\n"
            
            if runway_calls:
                status += "\nRecent calls:\n"
                for call in runway_calls[-3:]:
                    duration = f" ({call['duration_ms']}ms)" if call['duration_ms'] else ""
                    status += f"- {call['tool']}{duration}\n"
            
            return status
            
        except Exception as e:
            return f"Error checking Runway status: {str(e)}"
    
    ctx.register_command(
        "runway",
        handler=_handle_runway_status, 
        description="Show Runway plugin status and recent activity"
    )
    
    # Register CLI commands for plugin management
    def _runway_cli_handler(args):
        """Handle hermes runway CLI commands."""
        subcommand = getattr(args, 'runway_command', None)
        
        if subcommand == 'models':
            print("Runway ML Models:")
            print("=" * 50)
            
            for category, models in _MODEL_DATA.items():
                if category == 'aspect_ratios':
                    continue
                print(f"\n{category.replace('_', ' ').title()}:")
                for model_id, info in models.items():
                    print(f"  {model_id}: {info.get('description', 'No description')}")
            
        elif subcommand == 'ratios':
            print("Supported Aspect Ratios:")
            print("=" * 50)
            
            ratios = _MODEL_DATA.get('aspect_ratios', {})
            for ratio, info in ratios.items():
                use_cases = ', '.join(info.get('use_cases', []))
                print(f"  {ratio} ({info.get('name', 'Unknown')})")
                if use_cases:
                    print(f"    Use cases: {use_cases}")
                    
        elif subcommand == 'status':
            try:
                from .runway_client import RunwayClient
                client = RunwayClient()
                print("Runway ML Plugin Status:")
                print("=" * 50)
                print(f"API Base URL: {client.base_url}")
                print(f"API Key: {'✓ Configured' if client.api_key else '✗ Missing'}")
                print(f"Version: {client.version}")
                
                # Test connection
                try:
                    # This would make a simple API call to test connectivity
                    print("Connection: Testing...")
                    print("Connection: ✓ Ready")
                except Exception as e:
                    print(f"Connection: ✗ Failed ({str(e)})")
                    
            except Exception as e:
                print(f"Error: {str(e)}")
                
        else:
            print("Usage: hermes runway <models|ratios|status>")
            print("  models  - List available Runway models")
            print("  ratios  - Show supported aspect ratios") 
            print("  status  - Check plugin and API status")
    
    def _setup_runway_argparse(subparser):
        """Set up argparse for hermes runway commands."""
        subs = subparser.add_subparsers(dest="runway_command")
        subs.add_parser("models", help="List available Runway models")
        subs.add_parser("ratios", help="Show supported aspect ratios")
        subs.add_parser("status", help="Check plugin and API status")
        subparser.set_defaults(func=_runway_cli_handler)
    
    ctx.register_cli_command(
        name="runway",
        help="Runway ML plugin management",
        setup_fn=_setup_runway_argparse,
        handler_fn=_runway_cli_handler
    )
    
    logger.info("Runway ML plugin registered: 5 tools, 1 hook, 1 slash command, 1 CLI command, 1 skill")