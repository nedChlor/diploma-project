// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else {
    iconSvg = `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-leave');
    toast.addEventListener('animationend', () => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    });
  }, 3500);
}

window.showToast = showToast;

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
// Mobile Nav (hamburger)
// ============================================

const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');
const mobileNavOverlay = document.getElementById('mobileNavOverlay');

function openMobileNav() {
  mobileNav.classList.add('open');
  mobileNavOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  mobileNav.classList.remove('open');
  mobileNavOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    if (mobileNav.classList.contains('open')) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  });
}

if (mobileNavOverlay) {
  mobileNavOverlay.addEventListener('click', closeMobileNav);
}

if (mobileNav) {
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMobileNav();
});

// ============================================
// Translation History Management
// ============================================

let allHistoryCache = [];
let historyCurrentPage = 0;
const HISTORY_PAGE_SIZE = 10;

async function fetchAllHistory() {
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
      return history;
    } catch (error) {
      console.error('Error loading history from Firestore:', error);
      showToast('Ошибка загрузки истории', 'error');
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
    history.sort((a, b) => b.timestamp - a.timestamp);
    return history;
  }
}

async function loadHistory(isLoadMore = false) {
  if (!isLoadMore) {
    historyCurrentPage = 0;
    allHistoryCache = await fetchAllHistory();
  } else {
    historyCurrentPage++;
  }
  
  const start = historyCurrentPage * HISTORY_PAGE_SIZE;
  const end = start + HISTORY_PAGE_SIZE;
  return allHistoryCache.slice(start, end);
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
  const item = allHistoryCache[index];
  if (window.currentUser) {
    try {
      if (item && item.id) {
        await window.deleteDoc(window.doc(window.db, 'translations', item.id));
      }
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      showToast('Ошибка при удалении', 'error');
    }
  } else {
    allHistoryCache.splice(index, 1);
    saveHistory(allHistoryCache);
  }
}

async function renderHistory(isLoadMore = false) {
  const historyChunk = await loadHistory(isLoadMore);

  const loadMoreContainer = document.getElementById('loadMoreContainer');
  if (loadMoreContainer) {
    if (historyChunk.length === HISTORY_PAGE_SIZE) {
      loadMoreContainer.classList.remove('hidden');
    } else {
      loadMoreContainer.classList.add('hidden');
    }
  }

  const historyToRender = allHistoryCache.slice(0, (historyCurrentPage + 1) * HISTORY_PAGE_SIZE);

  if (historyToRender.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <p>Пока пусто —<br>сделайте первый перевод!</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = historyToRender.map((item, index) => `
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
    const historyItem = historyToRender[index];

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
const loadMoreBtn = document.getElementById('loadMoreBtn');
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
      showToast('Введите текст для перевода', 'error');
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
        showToast('Сервис перевода временно перегружен. Попробуйте через несколько минут.', 'error');
        return;
      } else if (status === 429) {
        showToast('Превышен лимит запросов. Попробуйте позже.', 'error');
        return;
      } else if (status === 400) {
        showToast('Некорректный запрос. Проверьте введённые данные.', 'error');
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        showToast('Ошибка: Неверный ответ сервера', 'error');
        return;
      }

      if (!response.ok) {
        showToast('Ошибка: ' + (data.error || 'Неизвестная ошибка сервера'), 'error');
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
      showToast('Ошибка сети. Убедитесь что бэкенд запущен.<br>' + error.message, 'error');
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
      showToast('Нет текста для копирования', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Текст скопирован', 'success');
      copyOutputBtn.classList.add('success');
      copyOutputBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
      setTimeout(() => {
        copyOutputBtn.classList.remove('success');
        copyOutputBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      }, 1500);
    } catch (err) {
      showToast('Не удалось скопировать текст', 'error');
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

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', async () => {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Загрузка...';
    await renderHistory(true);
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Загрузить еще';
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
