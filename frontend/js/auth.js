// ============================================
// Firebase Authentication Integration
// ============================================

function showMessage(elementId, message, type = 'error') {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.className = `message ${type}`;
  element.classList.remove('hidden');

  setTimeout(() => {
    element.classList.add('hidden');
  }, 5000);
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
      const user = userCredential.user;
      console.log('User signed in:', user);
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
        case 'auth/invalid-credential':
          message = 'Неверный email или пароль';
          break;
        default:
          message = error.message;
      }
      showMessage('loginMessage', message);
    }
  });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
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
}
