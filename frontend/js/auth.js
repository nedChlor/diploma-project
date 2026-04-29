// ============================================
// Firebase Auth Integration
// ============================================

// Функция для показа сообщений
function showMessage(elementId, message, type = 'error') {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = 'block';

  // Скрыть через 5 секунд
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}

// Обработчик формы входа
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
    const user = userCredential.user;

    console.log('User signed in:', user);

    // Перенаправление на главную страницу
    window.location.href = 'index.html';

  } catch (error) {
    console.error('Login error:', error);
    let message = 'Ошибка входа';
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'Пользователь не найден';
        break;
      case 'auth/wrong-password':
        message = 'Неверный пароль';
        break;
      case 'auth/invalid-email':
        message = 'Неверный email';
        break;
      default:
        message = error.message;
    }
    showMessage('loginMessage', message);
  }
});

// Обработчик формы регистрации
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  if (password !== confirmPassword) {
    showMessage('registerMessage', 'Пароли не совпадают');
    return;
  }

  if (password.length < 6) {
    showMessage('registerMessage', 'Пароль должен быть не менее 6 символов');
    return;
  }

  try {
    const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
    const user = userCredential.user;

    console.log('User registered:', user);

    // Перенаправление на главную страницу
    window.location.href = 'index.html';

  } catch (error) {
    console.error('Registration error:', error);
    let message = 'Ошибка регистрации';
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Email уже используется';
        break;
      case 'auth/invalid-email':
        message = 'Неверный email';
        break;
      case 'auth/weak-password':
        message = 'Слабый пароль';
        break;
      default:
        message = error.message;
    }
    showMessage('registerMessage', message);
  }
});

// Функция для выхода (если нужно добавить кнопку выхода)
// async function logout() {
//   try {
//     await window.signOut(window.auth);
//     console.log('User signed out');
//     // Обновить UI
//   } catch (error) {
//     console.error('Logout error:', error);
//   }
// }