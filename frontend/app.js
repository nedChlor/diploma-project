// ============================================
// Переключение темы
// ============================================

const themeToggle = document.getElementById('themeToggle');

// Иконки
const sunIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="5"/>
  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
</svg>`;

const moonIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`;

// Применить тему
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    themeToggle.innerHTML = sunIcon;
    themeToggle.setAttribute('aria-label', 'Включить светлую тему');
  } else {
    document.documentElement.classList.remove('dark');
    themeToggle.innerHTML = moonIcon;
    themeToggle.setAttribute('aria-label', 'Включить тёмную тему');
  }
}

// Загрузить сохранённую тему или системную
const savedTheme = localStorage.getItem('theme');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme || (systemDark ? 'dark' : 'light'));

// Переключение по клику
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);
  applyTheme(newTheme);
});

// ============================================
// Переводчик
// ============================================

const translateBtn = document.getElementById('translateBtn');

// Очистка полей при загрузке страницы
window.addEventListener('load', () => {
  inputText.value = '';
  outputText.value = '';
  analysisResult.innerHTML = '';
});
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const langFrom = document.getElementById('langFrom');
const langTo = document.getElementById('langTo');
const analysisResult = document.getElementById('analysisResult');

const originalBtnIcon = translateBtn.innerHTML;

translateBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  if (!text) {
    alert('Введите текст для перевода');
    return;
  }
  translateBtn.disabled = true;
  translateBtn.innerHTML = '<div class="spinner"></div>';
  try {
    const response = await fetch('http://127.0.0.1:5000/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        from_lang: langFrom.value,
        to_lang: langTo.value
      })
    });
    const data = await response.json();
        if (response.ok) {
          outputText.value = data.translation;
          let analysis = data.analysis.replace(/\n/g, '<br>');
          // Simple markdown to HTML
          analysis = analysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          analysis = analysis.replace(/\*(.*?)\*/g, '<em>$1</em>');
          analysisResult.innerHTML = analysis;
        } else {
      alert('Ошибка: ' + data.error);
    }
  } catch (error) {
    alert('Ошибка сети: ' + error.message);
  } finally {
    translateBtn.disabled = false;
    translateBtn.innerHTML = originalBtnIcon;
  }
});