# Standard library imports
import os
import sys
import json
import logging
import re
import webbrowser
from threading import Timer

# Third-party imports
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from openai import OpenAI

# Local imports
from config import OPENROUTER_API_KEY, MODEL_NAME, DEBUG, PORT, MAX_TEXT_LENGTH, REQUESTS_PER_MINUTE

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if getattr(sys, 'frozen', False):
    base_dir = os.path.dirname(sys.executable)
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

frontend_dir = os.path.abspath(os.path.join(base_dir, '..', 'frontend'))

app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
CORS(app)

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[f"{REQUESTS_PER_MINUTE} per minute"]
)

# Клиент OpenRouter (OpenAI-совместимый)
client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)

# ============================================
# Раздача фронтенда
# ============================================

@app.route('/')
@limiter.exempt
def serve_index():
    return app.send_static_file('index.html')

@app.route('/<path:filename>')
@limiter.exempt
def serve_static(filename):
    return app.send_static_file(filename)

# ============================================
# API
# ============================================

@app.route('/translate', methods=['POST'])
@limiter.limit("60 per minute")
def translate():
    """
    Handle translation requests with lexical analysis.

    Expects JSON payload with 'text', 'from_lang', 'to_lang'.
    Returns JSON with 'translation' and 'analysis'.
    """
    data = request.json
    text = data.get('text', '').strip()
    from_lang = data.get('from_lang', '')
    to_lang = data.get('to_lang', '')

    # Input validation
    if not text:
        logger.warning("Missing text field")
        return jsonify({'error': 'Text is required'}), 400
    if len(text) > MAX_TEXT_LENGTH:
        logger.warning(f"Text too long: {len(text)} characters")
        return jsonify({'error': f'Text too long (max {MAX_TEXT_LENGTH} characters)'}), 400
    valid_langs = ['русский', 'английский', 'казахский']
    if from_lang not in valid_langs + ['auto'] or to_lang not in valid_langs:
        logger.warning(f"Invalid languages: from={from_lang}, to={to_lang}")
        return jsonify({'error': 'Invalid language selection'}), 400
    if from_lang == to_lang:
        logger.warning("Same languages selected")
        return jsonify({'error': 'Source and target languages must be different'}), 400

    logger.info(f"Translation request: {len(text)} chars from {from_lang} to {to_lang}")

    try:
        # Create prompt for AI
        if from_lang == 'auto':
            prompt = f"""Translate the following text to {to_lang}. Automatically detect the source language.
Then perform a professional lexical and stylistic analysis of the ORIGINAL text.
All explanations must be written in {to_lang}."""
        else:
            prompt = f"""Translate the following text from {from_lang} to {to_lang}.
Then perform a professional lexical and stylistic analysis of the ORIGINAL text.
All explanations must be written in {to_lang}."""
        
        prompt += f"""

Respond ONLY with valid JSON, no markdown, no extra text:
{{
  "translation": "translated text here",
  "analysis": {{
    "words": [
      {{
        "word": "original word or phrase",
        "explanation": "meaning and role in the text"
      }}
    ],
    "style": "detailed description of the text's tone, mood, and stylistic features"
  }}
}}

Text: "{text}"
"""

        # Call OpenRouter API
        response = client.chat.completions.create(
            model = MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.choices[0].message.content.strip()

        if not response_text:
            logger.error("Empty response from OpenRouter")
            return jsonify({'error': 'Translation service returned empty response'}), 500

        # Extract JSON from response
        try:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                translation = result.get('translation', '').strip() or 'Translation not found'
                analysis_obj = result.get('analysis', {})
                # Сериализуем обратно как JSON для передачи на фронт
                analysis = json.dumps(analysis_obj, ensure_ascii=False)
            else:
                translation = response_text or 'Translation not found'
                analysis = json.dumps({"words": [], "style": "Analysis not available"}, ensure_ascii=False)
        except (json.JSONDecodeError, AttributeError):
            translation = response_text or 'Translation not found'
            analysis = json.dumps({"words": [], "style": "Analysis not available"}, ensure_ascii=False)

        logger.info("Translation successful")
        return jsonify({'translation': translation, 'analysis': analysis})

    except Exception as e:
        logger.error(f"Translation error: {e}")
        error_str = str(e)
        if '429' in error_str:
            return jsonify({'error': 'Request limit exceeded. Try again later.'}), 429
        elif '503' in error_str:
            return jsonify({'error': 'Translation service temporarily unavailable. Try again later.'}), 503
        else:
            return jsonify({'error': 'Translation service error. Try again later.'}), 500

if __name__ == '__main__':
    Timer(1, lambda: webbrowser.open_new(f'http://localhost:{PORT}/')).start()
    app.run(debug=DEBUG, port=PORT)