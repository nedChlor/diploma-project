import os
from dotenv import load_dotenv

load_dotenv()

# Настройки
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
PORT = int(os.getenv('PORT', 5000))

# Валидация
if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY not set")

# Лимиты
MAX_TEXT_LENGTH = 5000
REQUESTS_PER_MINUTE = 10