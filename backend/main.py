import re
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from openai import OpenAI

from config import OPENROUTER_API_KEY, DEBUG, PORT, MAX_TEXT_LENGTH, REQUESTS_PER_MINUTE

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
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

@app.route('/translate', methods=['POST'])
@limiter.limit("10 per minute")
def translate():
    data = request.json
    text = data.get('text', '').strip()
    from_lang = data.get('from_lang', '')
    to_lang = data.get('to_lang', '')

    # Валидация входных данных
    if not text:
        logger.warning("Missing text field")
        return jsonify({'error': 'Text is required'}), 400
    if len(text) > MAX_TEXT_LENGTH:
        logger.warning(f"Text too long: {len(text)} characters")
        return jsonify({'error': f'Text too long (max {MAX_TEXT_LENGTH} characters)'}), 400
    valid_langs = ['русский', 'английский', 'казахский']
    if from_lang not in valid_langs or to_lang not in valid_langs:
        logger.warning(f"Invalid languages: from={from_lang}, to={to_lang}")
        return jsonify({'error': 'Invalid language selection'}), 400
    if from_lang == to_lang:
        logger.warning("Same languages selected")
        return jsonify({'error': 'Source and target languages must be different'}), 400

    logger.info(f"Translation request: {len(text)} chars from {from_lang} to {to_lang}")

    try:
        prompt = f"""Translate the following text from {from_lang} to {to_lang}.
Then analyze key words from the TRANSLATED text only — explain what they mean, in {from_lang}.

Text: "{text}"

Respond with valid JSON in this format:
{{
  "translation": "translated text here",
  "analysis": "lexical analysis here"
}}"""

        response = client.chat.completions.create(
            model="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            messages=[
                {"role": "user", "content": prompt}
            ],
        )

        response_text = response.choices[0].message.content.strip()

        if not response_text:
            logger.error("Empty response from OpenRouter")
            return jsonify({'error': 'Сервис перевода вернул пустой ответ'}), 500

        # Извлекаем JSON из ответа
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group())
                translation = result.get('translation', '').strip() or 'Перевод не найден'
                analysis = result.get('analysis', '').strip() or 'Анализ не доступен'
            except json.JSONDecodeError:
                translation = response_text or 'Перевод не найден'
                analysis = 'Анализ не доступен'
        else:
            translation = response_text or 'Перевод не найден'
            analysis = 'Анализ не доступен'

        logger.info("Translation successful")
        return jsonify({'translation': translation, 'analysis': analysis})

    except Exception as e:
        logger.error(f"Translation error: {e}")
        error_str = str(e)
        if '429' in error_str:
            return jsonify({'error': 'Превышен лимит запросов. Попробуйте позже.'}), 429
        elif '503' in error_str:
            return jsonify({'error': 'Сервис перевода временно недоступен. Попробуйте позже.'}), 503
        else:
            return jsonify({'error': 'Ошибка сервиса перевода. Попробуйте позже.'}), 500

if __name__ == '__main__':
    app.run(debug=DEBUG, port=PORT)