import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

@app.route('/translate', methods=['POST'])
def translate():
    data = request.json
    text = data.get('text', '').strip()
    from_lang = data.get('from_lang', '')
    to_lang = data.get('to_lang', '')

    if not text or not from_lang or not to_lang:
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"Translate '{text}' from {from_lang} to {to_lang}.\n\nThen, provide brief lexical analysis of key words from the translated text, in {from_lang}.\n\nFormat:\nTranslation: [translated text]\nLexical Analysis: [analysis]"
        )
        full_text = response.text
        if 'Lexical Analysis:' in full_text:
            parts = full_text.split('Lexical Analysis:', 1)
            translation = parts[0].replace('Translation:', '').strip()
            analysis = parts[1].strip()
        else:
            translation = full_text
            analysis = 'Analysis not available'
        return jsonify({'translation': translation, 'analysis': analysis})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)