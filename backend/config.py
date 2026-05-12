import os
from dotenv import load_dotenv

load_dotenv()

# API Configuration
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')  # API key for OpenRouter service

# Application Settings
DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'  # Enable debug mode
PORT = int(os.getenv('PORT', 5000))  # Server port

# Validation
if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY not set in environment variables")

# Limits
MAX_TEXT_LENGTH = 5000  # Maximum allowed text length
REQUESTS_PER_MINUTE = 60  # Rate limit per minute