# LexAI — Интеллектуальный переводчик с анализом лексики

> Веб-приложение для перевода и лексического анализа текста на основе искусственного интеллекта. Поддерживает русский, английский и казахский языки.

🔗 **[Открыть приложение](https://lexai-hntd.onrender.com)**

---

## Возможности

- **Перевод текста** между тремя языками: русским, английским и казахским
- **Лексический анализ** — разбор ключевых слов и фраз оригинального текста с объяснением их роли и значения
- **Стилистический анализ** — описание тона, настроения и стилистических особенностей текста
- **История переводов** — сохранение переводов локально (localStorage) или в облаке (Firestore) для авторизованных пользователей
- **Авторизация** через Firebase Authentication (email/пароль)
- **Тёмная/светлая тема** с сохранением предпочтений
- **Адаптивный интерфейс** для мобильных устройств

---

## Стек технологий

| Часть | Технологии |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask, Flask-CORS, Flask-Limiter |
| AI | OpenRouter API (OpenAI-совместимый) |
| База данных | Firebase Firestore |
| Авторизация | Firebase Authentication |
| Деплой | Render |

---

## Структура проекта

```
diploma-project/
├── backend/
│   ├── main.py          # Flask-сервер, API-эндпоинты
│   ├── config.py        # Конфигурация (ключи, модель, порт)
│   └── requirements.txt
├── frontend/
│   ├── index.html       # Главная страница (переводчик)
│   ├── about.html       # О проекте
│   ├── login.html       # Страница авторизации
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js           # Основная логика
│       └── firebase-config.js
└── .gitignore
```

---

## Локальный запуск

### 1. Клонировать репозиторий

```bash
git clone https://github.com/nedChlor/diploma-project.git
cd diploma-project
```

### 2. Установить зависимости

```bash
cd backend
pip install -r requirements.txt
```

### 3. Создать файл конфигурации

Создайте файл `backend/config.py`:

```python
OPENROUTER_API_KEY = "your_openrouter_api_key"
MODEL_NAME = "your_model_name"
DEBUG = True
PORT = 5000
MAX_TEXT_LENGTH = 5000
REQUESTS_PER_MINUTE = 60
```

### 4. Запустить сервер

```bash
cd backend
python main.py
```

Приложение откроется автоматически по адресу `http://localhost:5000`

---

## API

### `POST /translate`

Переводит текст и выполняет лексический анализ.

**Тело запроса:**
```json
{
  "text": "Текст для перевода",
  "from_lang": "русский",
  "to_lang": "английский"
}
```

**Ответ:**
```json
{
  "translation": "Text to translate",
  "analysis": {
    "words": [
      {
        "word": "Текст",
        "explanation": "Explanation of the word's meaning and role"
      }
    ],
    "style": "Description of tone and stylistic features"
  }
}
```

**Допустимые значения языков:** `русский`, `английский`, `казахский`

---

## Переменные окружения (для Render)

| Переменная | Описание |
|-----------|---------|
| `OPENROUTER_API_KEY` | API-ключ OpenRouter |
| `MODEL_NAME` | Название модели |

---

## Автор

Разработано в рамках дипломного проекта по специальности «Программное обеспечение» (06130100).

**Студент:** Чловеков Н.  
**Руководитель:** Тулепбергенова Р.А.  
**Учебное заведение:** Политехнический колледж, Шымкент
