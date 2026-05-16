// ============================================
// Firebase Auth State
// ============================================

const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const userButton = document.getElementById('userButton');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const loginLink = document.getElementById('loginLink');

if (window.auth && window.onAuthStateChanged) {
  window.onAuthStateChanged(window.auth, (user) => {
    window.currentUser = user;
    if (user) {
      userInfo.classList.remove('hidden');
      if (loginLink) loginLink.classList.add('hidden');
      if (historyToggle) historyToggle.classList.remove('hidden');
      userName.textContent = user.email;
    } else {
      userInfo.classList.add('hidden');
      if (loginLink) loginLink.classList.remove('hidden');
      userDropdown.classList.add('hidden');
      historySidebar.classList.remove('open');
    }
  });
}

if (userButton) {
  userButton.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    if (window.auth && window.signOut) {
      await window.signOut(window.auth);
    }
    userDropdown.classList.add('hidden');
  });
}

// ============================================
// Translation History Management
// ============================================

async function loadHistory() {
  if (window.currentUser) {
    try {
      const q = window.query(
        window.collection(window.db, 'translations'),
        window.where('userId', '==', window.currentUser.uid)
      );
      const querySnapshot = await window.getDocs(q);
      const history = [];
      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });
      history.sort((a, b) => b.timestamp - a.timestamp);
      return history.slice(0, 50);
    } catch (error) {
      console.error('Error loading history from Firestore:', error);
      return [];
    }
  } else {
    const stored = localStorage.getItem('translationHistory');
    let history = [];
    try {
      history = JSON.parse(stored || '[]');
      if (!Array.isArray(history)) history = [];
    } catch (e) {
      console.error('Error parsing localStorage history:', e);
      history = [];
    }
    return history;
  }
}

async function saveHistory(history) {
  if (!window.currentUser) {
    localStorage.setItem('translationHistory', JSON.stringify(history.slice(-50)));
  }
}

async function addToHistory(translationData) {
  if (window.currentUser) {
    try {
      await window.addDoc(window.collection(window.db, 'translations'), {
        ...translationData,
        userId: window.currentUser.uid,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error adding to Firestore:', error);
    }
  } else {
    const history = await loadHistory();
    history.push(translationData);
    saveHistory(history);
  }
}

async function removeFromHistory(index) {
  if (window.currentUser) {
    try {
      const history = await loadHistory();
      const item = history[index];
      if (item && item.id) {
        await window.deleteDoc(window.doc(window.db, 'translations', item.id));
      }
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
    }
  } else {
    const history = await loadHistory();
    history.splice(index, 1);
    saveHistory(history);
  }
}

async function renderHistory() {
  const history = await loadHistory();

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <p>Пока пусто —<br>сделайте первый перевод!</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = history.map((item, index) => `
    <div class="history-item" data-index="${index}">
      <div class="history-item-header">
        <span class="history-item-lang">${item.fromLang} → ${item.toLang}</span>
        <span class="history-item-time">${new Date(item.timestamp).toLocaleString()}</span>
      </div>
      <div class="history-item-text"><strong>Оригинал:</strong> ${item.input.substring(0, 120)}${item.input.length > 120 ? '...' : ''}</div>
      <div class="history-item-text"><strong>Перевод:</strong> ${item.output.substring(0, 120)}${item.output.length > 120 ? '...' : ''}</div>
      <div class="history-item-actions">
        <button class="history-delete-btn delete-btn" data-index="${index}" title="Удалить">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Удалить
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.history-item').forEach(item => {
    const index = parseInt(item.dataset.index, 10);
    const historyItem = history[index];

    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn')) return;
      inputText.value = historyItem.input;
      outputText.value = historyItem.output;
      langFrom.value = historyItem.fromLang;
      langTo.value = historyItem.toLang;
      updateCharCount();
      if (historyItem.analysis) {
        renderAnalysis(historyItem.analysis);
        analysisSection.classList.remove('hidden');
      } else {
        analysisSection.classList.add('hidden');
      }
      historySidebar.classList.remove('open');
    });

    const deleteBtn = item.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await removeFromHistory(index);
        await renderHistory();
      });
    }
  });
}

// ============================================
// Theme Toggle
// ============================================

const themeToggle = document.getElementById('themeToggle');

const sunIcon = `<svg class="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="5"/>
  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
</svg>`;

const moonIcon = `<svg class="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`;

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

const savedTheme = localStorage.getItem('theme');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme || (systemDark ? 'dark' : 'light'));

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.classList.add('theme-transition-none');
  localStorage.setItem('theme', newTheme);
  applyTheme(newTheme);
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transition-none');
  }, 100);
});

// ============================================
// Translator
// ============================================

const translateBtn = document.getElementById('translateBtn');
const swapBtn = document.getElementById('swapBtn');
const copyOutputBtn = document.getElementById('copyOutputBtn');
const historyToggle = document.getElementById('historyToggle');
const historySidebar = document.getElementById('historySidebar');
const clearHistory = document.getElementById('clearHistory');
const historyList = document.getElementById('historyList');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const langFrom = document.getElementById('langFrom');
const langTo = document.getElementById('langTo');
const analysisSection = document.getElementById('analysis');
const analysisResult = document.getElementById('analysisResult');
const charCount = document.getElementById('charCount');
const MAX_CHARS = 5000;

let lastLangFrom = langFrom ? langFrom.value : '';
let lastLangTo = langTo ? langTo.value : '';

function updateCharCount() {
  if (!charCount) return;
  const len = inputText.value.length;
  charCount.textContent = `${len} / ${MAX_CHARS}`;
  charCount.classList.remove('near-limit', 'at-limit');
  if (len > MAX_CHARS * 0.9) {
    charCount.classList.add('at-limit');
  } else if (len > MAX_CHARS * 0.75) {
    charCount.classList.add('near-limit');
  }
}

if (inputText) {
  inputText.addEventListener('input', updateCharCount);
}

if (langFrom) {
  langFrom.addEventListener('change', () => {
    const newLangFrom = langFrom.value;
    if (newLangFrom === langTo.value) {
      langTo.value = lastLangFrom;
    }
    lastLangFrom = newLangFrom;
  });
}

if (langTo) {
  langTo.addEventListener('change', () => {
    const newLangTo = langTo.value;
    if (newLangTo === langFrom.value) {
      langFrom.value = lastLangTo;
    }
    lastLangTo = newLangTo;
  });
}

window.addEventListener('load', () => {
  if (inputText) inputText.value = '';
  if (outputText) outputText.value = '';
  if (analysisResult) analysisResult.innerHTML = '';
  if (analysisSection) analysisSection.classList.add('hidden');
  if (langFrom) lastLangFrom = langFrom.value;
  if (langTo) lastLangTo = langTo.value;
  updateCharCount();
});

function renderAnalysis(analysisHtml) {
  // Split analysis into sections by headers (## or **)
  const sections = [];
  const lines = analysisHtml.split('<br>');
  let currentSection = { title: '', content: [] };

  lines.forEach(line => {
    const headerMatch = line.match(/<strong>(.+?)<\/strong>/);
    if (headerMatch && line.replace(/<[^>]+>/g, '').trim().length < 60) {
      if (currentSection.content.length > 0 || currentSection.title) {
        sections.push({ ...currentSection });
      }
      currentSection = { title: headerMatch[1], content: [] };
    } else {
      const cleanLine = line.replace(/<[^>]+>/g, '').trim();
      if (cleanLine) {
        currentSection.content.push(line);
      }
    }
  });
  if (currentSection.title || currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  if (sections.length <= 1) {
    analysisResult.innerHTML = `<div class="analysis-card"><div class="card-content">${analysisHtml}</div></div>`;
    return;
  }

  analysisResult.innerHTML = sections.map(section => `
    <div class="analysis-card">
      ${section.title ? `<h3>${section.title}</h3>` : ''}
      <div class="card-content">${section.content.join('<br>')}</div>
    </div>
  `).join('');
}

if (translateBtn) {
  translateBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();

    if (!text) {
      alert('Введите текст для перевода');
      return;
    }

    translateBtn.disabled = true;
    translateBtn.classList.add('loading');

    try {
      const response = await fetch('/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          from_lang: langFrom.value,
          to_lang: langTo.value
        })
      });

      const status = response.status;

      if (status === 503) {
        alert('Сервис перевода временно перегружен. Попробуйте через несколько минут.');
        return;
      } else if (status === 429) {
        alert('Превышен лимит запросов. Попробуйте позже.');
        return;
      } else if (status === 400) {
        alert('Некорректный запрос. Проверьте введённые данные.');
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        alert('Ошибка: Неверный ответ сервера');
        return;
      }

      if (!response.ok) {
        alert('Ошибка: ' + (data.error || 'Неизвестная ошибка сервера'));
        return;
      }

      outputText.value = data.translation;

      let analysis = data.analysis
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

      renderAnalysis(analysis);
      analysisSection.classList.remove('hidden');

      await addToHistory({
        input: inputText.value,
        output: data.translation,
        fromLang: langFrom.value,
        toLang: langTo.value,
        analysis: analysis,
        timestamp: Date.now()
      });

    } catch (error) {
      alert('Ошибка сети. Убедитесь что бэкенд запущен.\n' + error.message);
    } finally {
      translateBtn.disabled = false;
      translateBtn.classList.remove('loading');
    }
  });
}

if (swapBtn) {
  swapBtn.addEventListener('click', () => {
    const tempLang = langFrom.value;
    langFrom.value = langTo.value;
    langTo.value = tempLang;
    lastLangFrom = langFrom.value;
    lastLangTo = langTo.value;

    if (outputText.value.trim()) {
      const tempText = inputText.value;
      inputText.value = outputText.value;
      outputText.value = tempText;
      updateCharCount();
    }

    if (analysisResult) analysisResult.innerHTML = '';
    if (analysisSection) analysisSection.classList.add('hidden');
  });
}

if (copyOutputBtn) {
  copyOutputBtn.addEventListener('click', async () => {
    const text = outputText.value.trim();
    if (!text) {
      alert('Нет текста для копирования');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      copyOutputBtn.classList.add('success');
      copyOutputBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
      setTimeout(() => {
        copyOutputBtn.classList.remove('success');
        copyOutputBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      }, 1500);
    } catch (err) {
      alert('Не удалось скопировать текст');
    }
  });
}

if (historyToggle) {
  historyToggle.addEventListener('click', async () => {
    historySidebar.classList.toggle('open');
    if (historySidebar.classList.contains('open')) {
      await renderHistory();
    }
  });
}

if (clearHistory) {
  clearHistory.addEventListener('click', async () => {
    if (window.currentUser) {
      try {
        const history = await loadHistory();
        for (const item of history) {
          if (item.id) {
            await window.deleteDoc(window.doc(window.db, 'translations', item.id));
          }
        }
        await renderHistory();
      } catch (error) {
        console.error('Error clearing Firestore history:', error);
      }
    } else {
      localStorage.removeItem('translationHistory');
      localStorage.setItem('translationHistory', '[]');
      await renderHistory();
    }
  });
}

document.addEventListener('click', (e) => {
  if (historySidebar && !historySidebar.contains(e.target) && historyToggle && !historyToggle.contains(e.target)) {
    historySidebar.classList.remove('open');
  }
});

document.addEventListener('click', (e) => {
  if (userInfo && !userInfo.contains(e.target)) {
    userDropdown.classList.add('hidden');
  }
});

// ============================================
// Auth Tabs (login.html)
// ============================================

const authTabs = document.getElementById('authTabs');
const loginFormWrapper = document.getElementById('loginFormWrapper');
const registerFormWrapper = document.getElementById('registerFormWrapper');

if (authTabs) {
  authTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.auth-tab');
    if (!tab) return;

    const tabName = tab.dataset.tab;

    authTabs.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    if (tabName === 'register') {
      authTabs.classList.add('tab-register');
      loginFormWrapper.classList.add('hidden');
      registerFormWrapper.classList.remove('hidden');
    } else {
      authTabs.classList.remove('tab-register');
      loginFormWrapper.classList.remove('hidden');
      registerFormWrapper.classList.add('hidden');
    }
  });
}
