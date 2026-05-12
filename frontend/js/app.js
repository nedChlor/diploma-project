// ============================================
// Firebase Auth State
// ============================================

const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const userButton = document.getElementById('userButton');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const loginLink = document.getElementById('loginLink');

// Проверка состояния аутентификации
if (window.auth && window.onAuthStateChanged) {
  window.onAuthStateChanged(window.auth, (user) => {
    window.currentUser = user;
    if (user) {
      // Пользователь авторизован
      userInfo.classList.remove('hidden');
      if (loginLink) loginLink.classList.add('hidden');
      if (historyToggle) historyToggle.classList.remove('hidden');
      userName.textContent = user.email;
    } else {
      // Пользователь не авторизован
      userInfo.classList.add('hidden');
      if (loginLink) loginLink.classList.remove('hidden');
      userDropdown.classList.add('hidden'); // Скрыть dropdown
      historySidebar.classList.remove('active'); // Закрыть sidebar
    }
  });
}

// Обработчик кнопки пользователя
if (userButton) {
  userButton.addEventListener('click', () => {
    userDropdown.classList.toggle('hidden');
  });
}

// Обработчик выхода
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await window.signOut(window.auth);
      userDropdown.classList.add('hidden');
      console.log('User signed out');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Ошибка выхода');
    }
  });
}

// Закрыть dropdown при клике вне
document.addEventListener('click', (e) => {
  if (!userInfo.contains(e.target)) {
    userDropdown.classList.add('hidden');
  }
});

// ============================================
// Translation History Management
// ============================================

/**
 * Load translation history from storage.
 * @returns {Promise<Array>} History array
 */
async function loadHistory() {
  if (window.currentUser) {
    // Загрузить из Firestore
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
      // Сортировать по timestamp desc
      history.sort((a, b) => b.timestamp - a.timestamp);
      return history.slice(0, 50); // Ограничить 50
    } catch (error) {
      console.error('Error loading history from Firestore:', error);
      return [];
    }
  } else {
    // Загрузить из localStorage
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

// Сохранить историю
async function saveHistory(history) {
  if (window.currentUser) {
    // Сохранить в Firestore (уже сохранено при добавлении)
    // Для очистки, можно удалить все документы
  } else {
    // Сохранить в localStorage
    localStorage.setItem('translationHistory', JSON.stringify(history.slice(-50)));
  }
}

// Добавить перевод в историю
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
    // Добавить в localStorage
    const history = await loadHistory();
    history.push(translationData);
    saveHistory(history);
  }
}

// Удалить перевод из истории
async function removeFromHistory(index) {
  if (window.currentUser) {
    try {
      const history = await loadHistory();
      const item = history[index];
      if (item.id) {
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

// Render history list
async function renderHistory() {
  const originalHistory = await loadHistory();
  const reversedHistory = originalHistory; // Already sorted from newest to oldest
  historyList.innerHTML = reversedHistory.length === 0
    ? '<p>История пуста</p>'
    : reversedHistory.map((item, index) => {
        const originalIndex = originalHistory.length - 1 - index;
        return `
        <div class="history-item" data-index="${index}">
          <h4>${item.fromLang} → ${item.toLang}</h4>
          <p><strong>Оригинал:</strong> ${item.input.substring(0, 100)}${item.input.length > 100 ? '...' : ''}</p>
          <p><strong>Перевод:</strong> ${item.output.substring(0, 100)}${item.output.length > 100 ? '...' : ''}</p>
          <div class="history-actions">
            <button class="delete-btn" data-index="${index}" title="Удалить">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <path d="M10 11v6"/>
                <path d="M14 11v6"/>
              </svg>
            </button>
          </div>
          <small>${new Date(item.timestamp).toLocaleString()}</small>
        </div>
      `;
      }).join('');

  // Обработчики клика на элементы истории
  document.querySelectorAll('.history-item').forEach(item => {
    const index = item.dataset.index;
    const historyItem = history[index];

    // Клик на элемент (восстановить перевод)
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('copy-btn') || e.target.classList.contains('delete-btn')) return;
      inputText.value = historyItem.input;
      outputText.value = historyItem.output;
      langFrom.value = historyItem.fromLang;
      langTo.value = historyItem.toLang;
      analysisResult.innerHTML = historyItem.analysis || '';
      if (historyItem.analysis) {
        analysisSection.classList.remove('hidden');
      } else {
        analysisSection.classList.add('hidden');
      }
      // Закрыть sidebar
      historySidebar.classList.remove('active');
    });



    // Кнопка удаления
    item.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation(); // Предотвратить bubble up
      await removeFromHistory(index);
      await renderHistory();
    });
  });
}

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

// Сначала объявляем все переменные
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
const originalBtnIcon = translateBtn ? translateBtn.innerHTML : '';

// Очистка полей при загрузке страницы
window.addEventListener('load', () => {
  if (inputText) inputText.value = '';
  if (outputText) outputText.value = '';
  if (analysisResult) analysisResult.innerHTML = '';
  if (analysisSection) analysisSection.classList.add('hidden');
});

// Обработчик кнопки перевода (только если кнопка есть на странице)
if (translateBtn) {
  translateBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();

    if (!text) {
      alert('Введите текст для перевода');
      return;
    }

    // Показываем спиннер
    translateBtn.disabled = true;
    translateBtn.innerHTML = '<div class="spinner"></div>';

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

      let data;
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

      // Вставляем перевод
      outputText.value = data.translation;

      // Форматируем и показываем анализ
      let analysis = data.analysis.replace(/\n/g, '<br>');
      analysis = analysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      analysis = analysis.replace(/\*(.*?)\*/g, '<em>$1</em>');
      analysisResult.innerHTML = analysis;

      // Показываем блок анализа
      analysisSection.classList.remove('hidden');

      // Сохранить в историю
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
      // Возвращаем иконку кнопки
      translateBtn.disabled = false;
      translateBtn.innerHTML = originalBtnIcon;
    }
  });
}

// Обработчик кнопки обмена языками
if (swapBtn) {
  swapBtn.addEventListener('click', () => {
    // Обменять языки
    const tempLang = langFrom.value;
    langFrom.value = langTo.value;
    langTo.value = tempLang;

    // Обменять тексты только если есть перевод
    if (outputText.value.trim()) {
      const tempText = inputText.value;
      inputText.value = outputText.value;
      outputText.value = tempText;
    }

    // Очистить анализ
    if (analysisResult) analysisResult.innerHTML = '';
    if (analysisSection) analysisSection.classList.add('hidden');
  });
}

// Обработчик кнопки копирования перевода
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
      copyOutputBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
      setTimeout(() => {
        copyOutputBtn.classList.remove('success');
        copyOutputBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      }, 1000);
    } catch (err) {
      alert('Не удалось скопировать текст');
    }
  });
}

// Обработчик кнопки истории
if (historyToggle) {
  historyToggle.addEventListener('click', async () => {
    historySidebar.classList.toggle('active');
    if (historySidebar.classList.contains('active')) {
      await renderHistory();
    }
  });
}

// Обработчик очистки истории
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
      localStorage.setItem('translationHistory', '[]'); // Очистить, установив пустой массив
      await renderHistory();
    }
  });
}

// Закрыть sidebar при клике вне
document.addEventListener('click', (e) => {
  if (!historySidebar.contains(e.target) && !historyToggle.contains(e.target)) {
    historySidebar.classList.remove('active');
  }
});