// =============================================
// STATE
// =============================================
let currentUser = null;
let items = [{ desc: '', amount: '' }];
let beneficiaries = [''];
let history = [];
let selectedIds = [];
let editingVoucherId = null;
let unsubscribeHistory = null;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
  <path d="M565-395q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm-226.5 56.5Q280-397 280-480t58.5-141.5Q397-680 480-680t141.5 58.5Q680-563 680-480t-58.5 141.5Q563-280 480-280t-141.5-58.5ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"/>
</svg>`;
const darkIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 640 640"><!--!Font Awesome Free v7.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="rgb(42, 43, 55)" d="M320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576C388.8 576 451.3 548.8 497.3 504.6C504.6 497.6 506.7 486.7 502.6 477.5C498.5 468.3 488.9 462.6 478.8 463.4C473.9 463.8 469 464 464 464C362.4 464 280 381.6 280 280C280 207.9 321.5 145.4 382.1 115.2C391.2 110.7 396.4 100.9 395.2 90.8C394 80.7 386.6 72.5 376.7 70.3C358.4 66.2 339.4 64 320 64z"/></svg>`
// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', function () {
  if (localStorage.getItem('gwx_theme') === 'light') {
    document.body.classList.add('light-theme');
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => btn.innerHTML = darkIcon);
  }

  if (!localStorage.getItem('gwx_cookies_accepted')) {
    setTimeout(() => {
      const banner = document.getElementById('cookie-banner');
      if (banner) banner.classList.add('show');
    }, 1000);
  }

  if (!auth || !db) {
    document.getElementById('auth-subtitle').textContent = "FIREBASE CONFIG MISSING. See assets/js/firebase-config.js";
    showToast("Firebase Config Missing", "error");
    return;
  }

  const savedEmail = localStorage.getItem('gwx_remembered_email');
  const savedPassword = localStorage.getItem('gwx_remembered_password');
  if (savedEmail) {
    const emailInput = document.getElementById('signin-email');
    const passInput = document.getElementById('signin-password');
    const rememberCheckbox = document.getElementById('signin-remember');
    if (emailInput) emailInput.value = savedEmail;
    if (passInput && savedPassword) passInput.value = savedPassword;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = { email: user.email, displayName: user.displayName || user.email.split('@')[0], uid: user.uid };
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.style.display = 'none';
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app-screen').style.display = 'flex';
      document.getElementById('f-prepared').value = currentUser.displayName;
      
      const profileNameEl = document.getElementById('profile-user-name');
      const profileEmailEl = document.getElementById('profile-user-email');
      if (profileNameEl) profileNameEl.textContent = currentUser.displayName;
      if (profileEmailEl) profileEmailEl.textContent = currentUser.email;

      const settingsAvatarTextEl = document.getElementById('settings-avatar-text');
      const settingsUsernameEl = document.getElementById('settings-username');
      const settingsEmailEl = document.getElementById('settings-email');
      
      if (settingsAvatarTextEl) settingsAvatarTextEl.textContent = currentUser.displayName.charAt(0).toUpperCase();
      if (settingsUsernameEl) settingsUsernameEl.value = currentUser.displayName;
      if (settingsEmailEl) settingsEmailEl.value = currentUser.email;

      // Load profile photo
      const applyProfilePhoto = (photoData) => {
        const avatar = document.getElementById('settings-avatar');
        const mainBtn = document.querySelector('.profile-btn');
        if (avatar) avatar.style.backgroundImage = `url(${photoData})`;
        if (settingsAvatarTextEl) settingsAvatarTextEl.style.display = 'none';
        if (mainBtn) {
          mainBtn.style.backgroundImage = `url(${photoData})`;
          mainBtn.style.backgroundSize = 'cover';
          mainBtn.style.backgroundPosition = 'center';
          mainBtn.innerHTML = '';
        }
      };

      const localPhoto = localStorage.getItem('profilePhoto_' + currentUser.email);
      if (localPhoto) {
        applyProfilePhoto(localPhoto);
      }

      db.collection('users').doc(currentUser.email).get().then(doc => {
        if (doc.exists && doc.data().profilePhoto) {
          const photoData = doc.data().profilePhoto;
          localStorage.setItem('profilePhoto_' + currentUser.email, photoData);
          applyProfilePhoto(photoData);
        } else if (doc.exists && doc.data().profilePhoto === null) {
          // Photo was deleted
          localStorage.removeItem('profilePhoto_' + currentUser.email);
          const avatar = document.getElementById('settings-avatar');
          const mainBtn = document.querySelector('.profile-btn');
          if (avatar) avatar.style.backgroundImage = 'none';
          if (settingsAvatarTextEl) settingsAvatarTextEl.style.display = '';
          if (mainBtn) {
            mainBtn.style.backgroundImage = 'none';
            mainBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
          }
        }
      }).catch(err => console.error("Error loading profile photo:", err));
      
      loadUserHistory();
    } else {
      currentUser = null;
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.style.display = 'none';
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('app-screen').style.display = 'none';
      if (unsubscribeHistory) {
        unsubscribeHistory();
        unsubscribeHistory = null;
      }
      history = [];
    }
  });

  setTodayDate();
  renderBeneficiaries();
  renderItems();
  adjustPreviewScale();
  window.addEventListener('resize', adjustPreviewScale);
  initHistoryResizer();
});

function initHistoryResizer() {
  const resizer = document.getElementById('history-resizer');
  const sidebar = document.getElementById('history-sidebar');
  if (!resizer || !sidebar) return;

  let isResizing = false;
  let startX;
  let startWidth;

  resizer.addEventListener('mousedown', function(e) {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    const dx = startX - e.clientX;
    const newWidth = Math.max(250, Math.min(800, startWidth + dx));
    sidebar.style.width = newWidth + 'px';
  });

  window.addEventListener('mouseup', function() {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('gwx_history_width', sidebar.style.width);
    }
  });

  const savedWidth = localStorage.getItem('gwx_history_width');
  if (savedWidth) {
    sidebar.style.width = savedWidth;
  }
}

function loadUserHistory() {
  const vouchersRef = db.collection('users').doc(currentUser.email).collection('vouchers');
  unsubscribeHistory = vouchersRef.onSnapshot(snapshot => {
    history = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      data.id = doc.id;
      history.push(data);
    });

    history.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      const ta = a.savedAt ? new Date(a.savedAt).getTime() : 0;
      const tb = b.savedAt ? new Date(b.savedAt).getTime() : 0;
      return tb - ta;
    });

    renderHistory();
    renderSelectedPreviews();
  }, error => {
    console.error("Error fetching history:", error);
    showToast("Error loading vouchers", "error");
  });
}

// =============================================
// AUTHENTICATION
// =============================================
function toggleAuthMode(mode) {
  document.getElementById('form-signin').classList.add('hidden');
  document.getElementById('form-signup').classList.add('hidden');
  document.getElementById('form-reset').classList.add('hidden');
  document.getElementById('tab-signin').classList.remove('active');
  document.getElementById('tab-signup').classList.remove('active');
  document.getElementById('auth-tabs').style.display = 'flex'; 

  if (mode === 'signup') {
    document.getElementById('form-signup').classList.remove('hidden');
    document.getElementById('auth-main-title').textContent = "Create an account";
    document.getElementById('auth-subtitle').textContent = "Set up your account to get started.";
    document.getElementById('tab-signup').classList.add('active');
  } else if (mode === 'reset') {
    document.getElementById('form-reset').classList.remove('hidden');
    document.getElementById('auth-main-title').textContent = "Reset password";
    document.getElementById('auth-subtitle').textContent = "Enter your email to receive a reset link.";
    document.getElementById('auth-tabs').style.display = 'none';
  } else {
    document.getElementById('form-signin').classList.remove('hidden');
    document.getElementById('auth-main-title').textContent = "Welcome back";
    document.getElementById('auth-subtitle').textContent = "Sign in to continue.";
    document.getElementById('tab-signin').classList.add('active');
  }
}

async function handleResetPassword() {
  if (!auth) return showToast("Firebase Config Missing", "error");
  const email = document.getElementById('reset-email').value.trim();
  if (!email) return showToast("Please enter your email.", 'error');

  try {
    await auth.sendPasswordResetEmail(email);
    showToast("Reset link sent! Check your email.");
    toggleAuthMode('signin');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSignIn() {
  if (!auth) return showToast("Firebase Config Missing", "error");
  
  const maxAttempts = 5;
  const lockoutTime = 5 * 60 * 1000; // 5 minutes
  let failedAttempts = parseInt(localStorage.getItem('gwx_failed_login_attempts') || '0');
  let lockoutUntil = parseInt(localStorage.getItem('gwx_login_lockout_until') || '0');

  if (Date.now() < lockoutUntil) {
    const minutesLeft = Math.ceil((lockoutUntil - Date.now()) / 60000);
    return showToast(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`, 'error');
  }

  const email = document.getElementById('signin-email').value.trim();
  const pass = document.getElementById('signin-password').value.trim();
  const remember = document.getElementById('signin-remember').checked;

  if (!email || !pass) return showToast("Please fill in all sign-in fields.", 'error');

  try {
    if (remember) {
      localStorage.setItem('gwx_remembered_email', email);
      localStorage.setItem('gwx_remembered_password', pass);
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } else {
      localStorage.removeItem('gwx_remembered_email');
      localStorage.removeItem('gwx_remembered_password');
      await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
    }
    await auth.signInWithEmailAndPassword(email, pass);
    
    // Reset on success
    localStorage.removeItem('gwx_failed_login_attempts');
    localStorage.removeItem('gwx_login_lockout_until');
    
    showToast(`Welcome back!`);
  } catch (err) {
    failedAttempts++;
    if (failedAttempts >= maxAttempts) {
      localStorage.setItem('gwx_login_lockout_until', Date.now() + lockoutTime);
      localStorage.removeItem('gwx_failed_login_attempts');
      showToast(`Account temporarily locked due to too many failed attempts. Try again in 5 minutes.`, 'error');
    } else {
      localStorage.setItem('gwx_failed_login_attempts', failedAttempts);
      showToast(`Invalid credentials. ${maxAttempts - failedAttempts} attempt(s) remaining.`, 'error');
    }
  }
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
  } else {
    input.type = "password";
  }
}

async function handleSignUp() {
  if (!auth) return showToast("Firebase Config Missing", "error");
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-password').value.trim();
  const confirmPass = document.getElementById('signup-confirm-password').value.trim();
  const name = document.getElementById('signup-name').value.trim();

  if (!email || !pass || !confirmPass || !name) return showToast("Please fill in all sign-up fields.", 'error');
  if (pass !== confirmPass) return showToast("Passwords do not match.", 'error');

  try {
    const userCred = await auth.createUserWithEmailAndPassword(email, pass);
    await userCred.user.updateProfile({ displayName: name });
    window.location.reload();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleSettings() {
  const menu = document.getElementById('profile-menu');
  if (menu) menu.classList.add('hidden');
  
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.add('active');
}

function closeSettingsModal(e) {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('active');
}

function switchSettingsTab(tabName) {
  const profileTab = document.getElementById('settings-tab-profile');
  const passwordTab = document.getElementById('settings-tab-password');
  const profileBtn = document.getElementById('tab-btn-profile');
  const passwordBtn = document.getElementById('tab-btn-password');

  if (!profileTab || !passwordTab) return;

  if (tabName === 'profile') {
    profileTab.classList.remove('hidden');
    passwordTab.classList.add('hidden');
    
    profileBtn.style.background = 'rgba(255,255,255,0.05)';
    profileBtn.style.border = '1px solid var(--border2)';
    profileBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
    profileBtn.style.color = '#fff';
    
    passwordBtn.style.background = 'transparent';
    passwordBtn.style.border = '1px solid transparent';
    passwordBtn.style.boxShadow = 'none';
    passwordBtn.style.color = 'var(--text2)';
  } else {
    profileTab.classList.add('hidden');
    passwordTab.classList.remove('hidden');
    
    passwordBtn.style.background = 'rgba(255,255,255,0.05)';
    passwordBtn.style.border = '1px solid var(--border2)';
    passwordBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
    passwordBtn.style.color = '#fff';
    
    profileBtn.style.background = 'transparent';
    profileBtn.style.border = '1px solid transparent';
    profileBtn.style.boxShadow = 'none';
    profileBtn.style.color = 'var(--text2)';
  }
}

function handleLogout() {
  if (auth) auth.signOut();
  document.getElementById('signin-email').value = '';
  document.getElementById('signin-password').value = '';
  document.getElementById('signup-email').value = '';
  document.getElementById('signup-password').value = '';
  document.getElementById('signup-confirm-password').value = '';
  document.getElementById('signup-name').value = '';
  toggleAuthMode('signin');
  showToast("Logged out successfully");
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('f-date').value = today;
}

// =============================================
// PREVIEW SCALE
// =============================================
function adjustPreviewScale() {
  const area = document.getElementById('preview-area');
  const wrapper = document.getElementById('page-scale-wrapper');
  if (!area || !wrapper) return;
  const areaW = area.clientWidth - 56;
  const actualW = areaW > 0 ? areaW : (window.innerWidth * 0.95) - 104;
  const areaH = area.clientHeight - 56;
  const actualH = areaH > 0 ? areaH : (window.innerHeight * 0.95) - 130;
  const pageW = 297 * 3.7795; // mm to px at 96dpi
  const pageH = 210 * 3.7795;
  const scaleW = actualW / pageW;
  const scaleH = actualH / pageH;
  const scale = Math.min(scaleW, scaleH, 1);
  wrapper.style.setProperty('--page-scale', scale);
}

function openPreviewModal() {
  document.getElementById('preview-modal').classList.add('active');
  setTimeout(adjustPreviewScale, 10);
}

function closePreviewModal() {
  document.getElementById('preview-modal').classList.remove('active');
}

function viewFromHistory(id) {
  const v = history.find(h => h.id === id);
  if (!v) return;
  const html = buildVoucherHTML(v, 1);
  const wrapper = document.getElementById('single-preview-wrapper');
  if (wrapper) {
    wrapper.innerHTML = `
      <div style="transform: scale(1.4); transform-origin: top center; margin-bottom: 90px;">
        <div class="voucher-cell" style="width: 99mm; height: 210mm; background: white; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #ccc; box-sizing: border-box; flex: none;">
          ${html}
        </div>
      </div>
    `;
  }
  document.getElementById('single-preview-modal').classList.add('active');
}

function closeSinglePreviewModal() {
  document.getElementById('single-preview-modal').classList.remove('active');
}



function loadSlotToForm(d) {
  document.getElementById('f-dept').value = d.dept;
  document.getElementById('f-date').value = d.date;
  document.getElementById('f-manager').value = d.manager || '';
  beneficiaries = Array.isArray(d.beneficiaries) && d.beneficiaries.length
    ? d.beneficiaries.map(b => b || '')
    : [d.beneficiary || ''];
  renderBeneficiaries();
  document.getElementById('f-account').value = d.account || '';
  document.getElementById('f-amount-words').value = d.amountWords || '';
  document.getElementById('f-prepared').value = d.prepared || '';
  document.getElementById('f-audit').value = d.audit || '';
  document.getElementById('f-approved').value = d.approved || '';
  document.getElementById('f-head').value = d.head || '';
  document.getElementById('f-coo').value = d.coo || '';
  document.getElementById('f-md').value = d.md || '';
  items = d.items.map(i => ({ ...i }));
}

function resetForm() {
  editingVoucherId = null;
  document.getElementById('f-dept').value = 'Greenlight';
  setTodayDate();
  ['f-manager', 'f-account', 'f-amount-words',
    'f-audit', 'f-approved', 'f-head', 'f-coo', 'f-md'].forEach(id => {
      document.getElementById(id).value = '';
    });
  document.getElementById('f-prepared').value = currentUser ? currentUser.displayName : '';
  beneficiaries = [''];
  renderBeneficiaries();
  items = [{ desc: '', amount: '' }];
}

function getFormData() {
  const cleanBeneficiaries = beneficiaries.map(b => b.trim()).filter(Boolean);
  return {
    dept: document.getElementById('f-dept').value || '',
    date: document.getElementById('f-date').value || '',
    manager: document.getElementById('f-manager').value || '',
    beneficiary: cleanBeneficiaries.join(', ') || '',
    beneficiaries: cleanBeneficiaries || [],
    account: document.getElementById('f-account').value || '',
    items: items.map(i => ({ desc: i.desc || '', amount: i.amount || '' })),
    amountWords: document.getElementById('f-amount-words').value || '',
    prepared: document.getElementById('f-prepared').value || '',
    audit: document.getElementById('f-audit').value || '',
    approved: document.getElementById('f-approved').value || '',
    head: document.getElementById('f-head').value || '',
    coo: document.getElementById('f-coo').value || '',
    md: document.getElementById('f-md').value || '',
  };
}

async function saveVoucher() {
  if (!db || !currentUser) return showToast("Not connected to database", "error");
  const data = getFormData();
  if (!data.beneficiary && !data.dept) return showToast('Please fill in at least the beneficiary name.', 'error');

  data.savedAt = new Date().toLocaleString();
  const vouchersRef = db.collection('users').doc(currentUser.email).collection('vouchers');

  try {
    if (editingVoucherId) {
      await vouchersRef.doc(editingVoucherId).set(data);
      editingVoucherId = null;
    } else {
      const safeName = (data.beneficiary || data.dept || 'Voucher').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const newId = `${safeName}_${Date.now()}`;
      await vouchersRef.doc(newId).set(data);
    }
    resetForm();
    renderItems();
    showToast('✓ Voucher saved to cloud!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Error saving voucher.', 'error');
  }
}

function isVoucherMatch(v, searchTerm) {
  if (!searchTerm) return true;
  const itemsText = v.items ? v.items.map(i => `${i.desc || ''} ${i.amount || ''}`).join(' ') : '';
  const beneficiariesText = v.beneficiaries ? v.beneficiaries.join(' ') : '';
  const textToSearch = `${v.dept || ''} ${v.date || ''} ${v.manager || ''} ${v.beneficiary || ''} ${beneficiariesText} ${v.account || ''} ${itemsText} ${v.amountWords || ''} ${v.prepared || ''} ${v.audit || ''} ${v.approved || ''} ${v.head || ''} ${v.coo || ''} ${v.md || ''}`.toLowerCase();
  
  const searchTokens = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  return searchTokens.every(token => textToSearch.includes(token));
}

function renderHistory() {
  const container = document.getElementById('history-list');
  const searchInput = document.getElementById('history-search');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

  if (history.length === 0) {
    container.innerHTML = '<div class="history-empty">No vouchers saved yet. Fill the form and click Save.</div>';
    updatePrintCount();
    return;
  }

  const filteredHistory = history.filter(v => isVoucherMatch(v, searchTerm));

  if (filteredHistory.length === 0) {
    container.innerHTML = '<div class="history-empty">No matching vouchers found.</div>';
    updatePrintCount();
    return;
  }

  const groupedHistory = {};
  filteredHistory.forEach(v => {
    const d = v.date || 'Unknown Date';
    if (!groupedHistory[d]) groupedHistory[d] = [];
    groupedHistory[d].push(v);
  });

  const html = Object.keys(groupedHistory).map(dateKey => {
    const groupItems = groupedHistory[dateKey];
    const itemsHtml = groupItems.map(v => {
      const isSelected = selectedIds.includes(v.id);
      const total = v.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
      const printedBadge = v.printed ? `<span class="printed-badge">PRINTED</span>` : '';
      return `<div class="history-item ${isSelected ? 'selected' : ''}" onclick="toggleSelect('${v.id}')">
        <div class="history-check"></div>
        <div class="history-info">
          <div class="history-info-name">
            ${escHtml(v.dept || v.beneficiary || 'Untitled')}
            ${printedBadge}
          </div>
          <div class="history-info-detail">${v.beneficiary ? escHtml(v.beneficiary) : ''}</div>
          <div class="history-info-amount">₦${fmtNum(total)}</div>
        </div>
        <div class="history-actions">
          <button class="history-btn" onclick="event.stopPropagation(); viewFromHistory('${v.id}')" title="View">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="history-btn" onclick="event.stopPropagation(); editFromHistory('${v.id}')" title="Edit">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          ${v.printed ? `<button class="history-btn" onclick="event.stopPropagation(); unmarkPrinted('${v.id}')" title="Remove Printed Stamp">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
          </button>` : ''}
          <button class="history-btn delete" onclick="event.stopPropagation(); deleteFromHistory('${v.id}')" title="Delete">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>`;
    }).join('');

    return `
      <div class="history-group">
        <div class="history-group-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <span style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${fmtDate(dateKey)}
          </span>
          <span style="font-size:12px; color:var(--text3); font-weight: 500;">${groupItems.length} items</span>
        </div>
        <div class="history-group-content">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
  updatePrintCount();
}

function toggleSelect(id) {
  const idx = selectedIds.indexOf(id);
  if (idx >= 0) {
    selectedIds.splice(idx, 1);
  } else {
    selectedIds.push(id);
  }
  renderHistory();
  renderSelectedPreviews();
}

function selectAllHistory() {
  const searchInput = document.getElementById('history-search');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

  const filteredHistory = history.filter(v => isVoucherMatch(v, searchTerm));

  filteredHistory.forEach(v => {
    if (!selectedIds.includes(v.id)) {
      selectedIds.push(v.id);
    }
  });
  renderHistory();
  renderSelectedPreviews();
}

function deselectAllHistory() {
  const searchInput = document.getElementById('history-search');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

  const filteredHistory = history.filter(v => isVoucherMatch(v, searchTerm));

  const idsToRemove = filteredHistory.map(v => v.id);
  selectedIds = selectedIds.filter(id => !idsToRemove.includes(id));

  renderHistory();
  renderSelectedPreviews();
}

async function deleteFromHistory(id) {
  if (!db || !currentUser) return;
  if (!(await showConfirm('Delete Voucher', 'Are you sure you want to delete this voucher? This action cannot be undone.'))) return;
  try {
    await db.collection('users').doc(currentUser.email).collection('vouchers').doc(id).delete();
    selectedIds = selectedIds.filter(sid => sid !== id);
    if (editingVoucherId === id) {
      editingVoucherId = null;
      resetForm();
    }
    showToast('Voucher deleted.', 'success');
  } catch (err) {
    console.error(err);
    showToast('Error deleting voucher.', 'error');
  }
}

async function editFromHistory(id) {
  if (!db || !currentUser) return;
  const currentData = getFormData();
  const hasContent = currentData.beneficiary.trim() !== '' || currentData.items.some(i => i.desc.trim() !== '' || i.amount !== '');

  let autoSaved = false;
  if (hasContent && editingVoucherId !== id) {
    currentData.savedAt = new Date().toLocaleString();
    const vouchersRef = db.collection('users').doc(currentUser.email).collection('vouchers');
    try {
      if (editingVoucherId) {
        await vouchersRef.doc(editingVoucherId).set(currentData);
      } else {
        const safeName = (currentData.beneficiary || currentData.dept || 'Voucher').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const newId = `${safeName}_${Date.now()}`;
        await vouchersRef.doc(newId).set(currentData);
      }
      autoSaved = true;
    } catch (err) {
      console.error(err);
    }
  }

  const v = history.find(h => h.id === id);
  if (!v) return;
  loadSlotToForm(v);
  renderItems();
  editingVoucherId = id;

  renderHistory();
  renderSelectedPreviews();

  if (autoSaved) {
    showToast('Current work auto-saved. Loaded new voucher.', 'success');
  } else {
    showToast('Voucher loaded for editing.', 'success');
  }
}

async function clearHistory() {
  if (history.length === 0) return;
  if (!(await showConfirm('Clear All History', 'Are you sure you want to clear all history? This cannot be undone!'))) return;

  try {
    const vouchersRef = db.collection('users').doc(currentUser.email).collection('vouchers');
    const snapshot = await vouchersRef.get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    selectedIds = [];
    editingVoucherId = null;
    resetForm();
    showToast('History cleared.', 'success');
  } catch (err) {
    console.error(err);
    showToast('Error clearing history.', 'error');
  }
}

function updatePrintCount() {
  const badge = document.getElementById('print-count');
  const actionsContainer = document.getElementById('print-actions-container');
  if (selectedIds.length > 0) {
    badge.textContent = selectedIds.length;
    badge.style.display = 'inline-block';
    if (actionsContainer) actionsContainer.style.display = 'flex';
  } else {
    badge.style.display = 'none';
    if (actionsContainer) actionsContainer.style.display = 'none';
  }
}

function renderSelectedPreviews() {
  const printWrapper = document.querySelector('.print-page-wrapper');
  const previewWrapper = document.getElementById('page-scale-wrapper');

  if (!printWrapper || !previewWrapper) return;

  printWrapper.innerHTML = '';
  previewWrapper.innerHTML = '';

  const numSlots = Math.max(3, Math.ceil(selectedIds.length / 3) * 3);
  let currentPrintPage = null;
  let currentPreviewPage = null;

  for (let i = 0; i < numSlots; i++) {
    if (i % 3 === 0) {
      currentPrintPage = document.createElement('div');
      currentPrintPage.className = 'a4-page';
      printWrapper.appendChild(currentPrintPage);

      currentPreviewPage = document.createElement('div');
      currentPreviewPage.className = 'a4-page';
      if (i > 0) currentPreviewPage.style.marginTop = '24px';
      previewWrapper.appendChild(currentPreviewPage);
    }

    const selId = selectedIds[i];
    const data = selId ? history.find(v => v.id === selId) : null;
    const html = buildVoucherHTML(data, i + 1);

    const printCell = document.createElement('div');
    printCell.className = 'voucher-cell';
    printCell.innerHTML = html;
    currentPrintPage.appendChild(printCell);

    const previewCell = document.createElement('div');
    previewCell.className = 'voucher-cell';
    previewCell.innerHTML = html;
    currentPreviewPage.appendChild(previewCell);
  }
}

// =============================================
// BENEFICIARY MANAGEMENT
// =============================================
function addBeneficiary() {
  if (beneficiaries.length >= 5) {
    showToast('Maximum 5 beneficiaries per voucher.', 'error');
    return;
  }
  beneficiaries.push('');
  renderBeneficiaries();
}

function removeBeneficiary(idx) {
  if (beneficiaries.length === 1) {
    beneficiaries[0] = '';
  } else {
    beneficiaries.splice(idx, 1);
  }
  renderBeneficiaries();
}

function renderBeneficiaries() {
  const container = document.getElementById('beneficiaries-container');
  if (!container) return;
  container.innerHTML = '';

  beneficiaries.forEach((name, i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <input type="text" placeholder="Beneficiary ${i + 1}"
        value="${escHtml(name || '')}"
        oninput="beneficiaries[${i}] = this.value" />
      <button class="btn-icon" onclick="removeBeneficiary(${i})" title="Remove">✕</button>
    `;
    container.appendChild(row);
  });
}

// =============================================
// ITEMS MANAGEMENT
// =============================================
function addItem() {
  if (items.length >= 8) {
    showToast('Maximum 8 items per voucher.', 'error');
    return;
  }
  items.push({ desc: '', amount: '' });
  renderItems();
}

function removeItem(idx) {
  if (items.length === 1) {
    showToast('At least one item is required.', 'error');
    return;
  }
  items.splice(idx, 1);
  renderItems();
}

function renderItems() {
  const container = document.getElementById('items-container');
  container.innerHTML = '';

  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="sn-badge">${i + 1}</div>
      <input class="col-desc" type="text" placeholder="Description…"
        value="${escHtml(item.desc || '')}"
        oninput="items[${i}].desc = this.value" />
      <input class="amount-input" type="number" placeholder="0.00" min="0" step="0.01"
        value="${item.amount || ''}"
        oninput="items[${i}].amount = this.value; recalcTotal()" />
      <button class="btn-icon" onclick="removeItem(${i})" title="Remove">✕</button>
    `;
    container.appendChild(row);
  });

  recalcTotal();
}

function recalcTotal() {
  const total = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
  document.getElementById('total-display').textContent = '₦' + fmtNum(total);
  // Auto-write words
  if (total > 0) {
    document.getElementById('f-amount-words').value = numToWords(total) + ' Naira Only';
  } else {
    document.getElementById('f-amount-words').value = '';
  }
}

// =============================================
// QUICK FILL (demo data)
// =============================================
const deptData = {
  'Greenlight': { beneficiary: 'Greenlight Services Ltd', account: '3045678912', prepared: 'A. Oke', audit: 'F. Bello', approved: 'K. Adeyemi', head: 'M. Ibrahim', coo: 'S. Okonkwo', md: 'C. Eze' },
  'Opay': { beneficiary: 'Opay Financial Services', account: '8012345678', prepared: 'B. Lawal', audit: 'T. Nwosu', approved: 'D. Afolabi', head: 'R. Ojo', coo: 'E. Abdullahi', md: 'J. Chukwu' },
  'Nis Courier': { beneficiary: 'NIS Courier Services', account: '0098765432', prepared: 'G. Musa', audit: 'H. Adamu', approved: 'P. Ogundele', head: 'L. Usman', coo: 'N. Babatunde', md: 'V. Salisu' },
  'Operations': { beneficiary: 'Operations Department', account: '1029384756', prepared: 'S. Kalu', audit: 'Y. Umar', approved: 'T. Briggs', head: 'O. Peters', coo: 'N. Babatunde', md: 'C. Eze' },
};

function autoFillSlot() {
  const dept = document.getElementById('f-dept').value;
  const d = deptData[dept] || deptData['Greenlight'];
  document.getElementById('f-manager').value = d.prepared;
  beneficiaries = [d.beneficiary];
  renderBeneficiaries();
  document.getElementById('f-account').value = d.account;
  document.getElementById('f-prepared').value = d.prepared;
  document.getElementById('f-audit').value = d.audit;
  document.getElementById('f-approved').value = d.approved;
  document.getElementById('f-head').value = d.head;
  document.getElementById('f-coo').value = d.coo;
  document.getElementById('f-md').value = d.md;
  items = [
    { desc: 'Transportation & Logistics', amount: '150000' },
    { desc: 'Service Charge', amount: '25000' },
  ];
  renderItems();
  showToast(`Quick filled with ${dept} data.`);
}

// =============================================
// RENDER VOUCHERS
// =============================================


function buildVoucherHTML(data, slotNum) {
  if (!data) {
    return `
      <div class="gwx-logo-block">
        <img src="assets/img/empty_voucher.png" alt="GWX Logo" style="height:12mm;max-width:36mm;object-fit:contain;display:block">
      </div>
      <div class="v-title">PAYMENT REQUEST VOUCHER</div>
      <div class="voucher-empty-state">
        <div class="empty-icon">□</div>
        <div class="empty-txt">Slot ${slotNum} is empty.<br>Fill the form and click "Apply to Slot ${slotNum}".</div>
      </div>
    `;
  }

  const d = data;
  const dateStr = d.date ? fmtDate(d.date) : '';
  const beneficiaryNames = Array.isArray(d.beneficiaries) && d.beneficiaries.length
    ? d.beneficiaries
    : (d.beneficiary ? [d.beneficiary] : []);
  const beneficiaryHtml = beneficiaryNames.map(name => escHtml(name)).join('<br>');
  const maxRows = 8;
  let rows = '';
  for (let i = 0; i < maxRows; i++) {
    const it = d.items[i];
    const sn = it ? (i + 1) : '';
    const desc = it ? escHtml(it.desc || '') : '';
    const amt = it && parseFloat(it.amount) ? fmtNum(parseFloat(it.amount)) : '';
    rows += `<tr>
      <td class="col-sn">${sn}</td>
      <td style="font-size:6pt">${desc}</td>
      <td class="col-amt" style="font-size:6pt">${amt}</td>
    </tr>`;
  }

  const total = d.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
  const totalStr = total > 0 ? fmtNum(total) : '';

  return `
    <div class="gwx-logo-block">
      <img src="assets/img/filled_voucher.png" alt="GWX" style="height:12mm;max-width:36mm;object-fit:contain;display:block">
    </div>

    <div class="v-title">PAYMENT REQUEST VOUCHER</div>

    <div class="v-info-block">
      <div class="v-row">
        <span class="v-cell-label">ORIGINATING DEPT.:</span>
        <span class="v-cell-value">${escHtml(d.dept || '')}</span>
        <span class="v-cell-date">DATE: <span class="dv">${dateStr}</span></span>
      </div>
      <div class="v-row">
        <span class="v-cell-label">DEPT. MANAGER SIGN:</span>
        <span class="v-cell-value">${escHtml(d.manager || '')}</span>
      </div>
      <div class="v-row">
        <span class="v-cell-label">NAME OF BENEFICIARY:</span>
        <span class="v-cell-value" style="display:block;line-height:1.25">${beneficiaryHtml}</span>
      </div>
      <div class="v-row" style="border-bottom:none">
        <span class="v-cell-label">ACCOUNT NUMBER:</span>
        <span class="v-cell-value" style="font-family:monospace;letter-spacing:0.5px">${escHtml(d.account || '')}</span>
      </div>
    </div>

    <div class="v-account-spacer"></div>

    <table class="v-items-table">
      <thead>
        <tr>
          <th class="col-sn">S/N</th>
          <th style="text-align:left">PAYMENT DESCRIPTION</th>
          <th class="col-amt">₦</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="v-total-row">
      <div class="v-total-label">TOTAL</div>
      <div class="v-total-value">${totalStr}</div>
    </div>

    <div class="v-amount-words">
      <div class="v-aw-label">AMOUNT IN WORDS:</div>
      <div class="v-aw-value">${escHtml(d.amountWords || '')}</div>
    </div>

    <div class="v-sig-block">
      ${sigRow('PREPARED BY', d.prepared)}
      ${sigRow('VALIDATED BY AUDIT', d.audit)}
      ${sigRow('PAYMENT APPROVED BY', d.approved)}
      ${sigRow('HEAD OF ACCOUNT', d.head)}
      ${sigRow('COO', d.coo)}
      <div class="v-sig-row" style="border-bottom:none">
        <span class="v-sig-label">MD:</span>
        <span class="v-sig-value">${escHtml(d.md || '')}</span>
      </div>
    </div>
  `;
}

function sigRow(label, value) {
  return `<div class="v-sig-row">
    <span class="v-sig-label">${label}:</span>
    <span class="v-sig-value">${escHtml(value || '')}</span>
  </div>`;
}

// =============================================
// PRINT
// =============================================
async function printSelected() {
  if (selectedIds.length === 0) {
    showToast('Please select at least one voucher from history to print.', 'error');
    return;
  }
  
  if (db && currentUser) {
    try {
      const vouchersRef = db.collection('users').doc(currentUser.email).collection('vouchers');
      const promises = selectedIds.map(id => vouchersRef.doc(id).update({ printed: true }).catch(e => console.error(e)));
      await Promise.all(promises);
    } catch(err) {
      console.error("Error updating printed status:", err);
    }
  }

  renderSelectedPreviews();
  window.print();
}

async function unmarkPrinted(id) {
  if (!db || !currentUser) return;
  try {
    await db.collection('users').doc(currentUser.email).collection('vouchers').doc(id).update({ printed: false });
    showToast('Removed printed stamp from voucher.', 'success');
  } catch (err) {
    console.error("Error unmarking printed:", err);
    showToast('Failed to remove printed stamp.', 'error');
  }
}

// =============================================
// NUMBER TO WORDS
// =============================================
function numToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function toW(n) {
    n = Math.floor(n);
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toW(n % 100) : '');
    if (n < 1e6) return toW(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toW(n % 1000) : '');
    if (n < 1e9) return toW(Math.floor(n / 1e6)) + ' Million' + (n % 1e6 ? ' ' + toW(n % 1e6) : '');
    return toW(Math.floor(n / 1e9)) + ' Billion' + (n % 1e9 ? ' ' + toW(n % 1e9) : '');
  }

  const intPart = Math.floor(num);
  const dec = Math.round((num - intPart) * 100);
  let result = toW(intPart);
  if (dec > 0) result += ' and ' + toW(dec) + ' Kobo';
  return result;
}

// =============================================
// UTILITIES
// =============================================
function showConfirm(title, message, okText = 'Delete') {
  return new Promise((resolve) => {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    
    const okBtn = document.getElementById('confirm-ok-btn');
    okBtn.innerText = okText;
    
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('active');

    const handleOk = () => { cleanup(); resolve(true); };
    const handleCancel = () => { cleanup(); resolve(false); };

    const cleanup = () => {
      modal.classList.remove('active');
      document.getElementById('confirm-cancel-btn').removeEventListener('click', handleCancel);
      okBtn.removeEventListener('click', handleOk);
    };

    document.getElementById('confirm-cancel-btn').addEventListener('click', handleCancel);
    okBtn.addEventListener('click', handleOk);
  });
}

function fmtNum(n) {
  return n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  void t.offsetWidth; // reflow
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// =============================================
// THEME & COOKIES
// =============================================
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  const btns = document.querySelectorAll('.theme-toggle-btn');
  if (isLight) {
    localStorage.setItem('gwx_theme', 'light');
    btns.forEach(btn => btn.innerHTML = darkIcon);
  } else {
    localStorage.setItem('gwx_theme', 'dark');
    // btns.forEach(btn => btn.textContent = '')
    btns.forEach(btn => btn.innerHTML = icon);
  }
}

function acceptCookies() {
  localStorage.setItem('gwx_cookies_accepted', 'true');
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.classList.remove('show');
}

// =============================================
// PROFILE MENU
// =============================================
function toggleProfileMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('profile-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

window.addEventListener('click', (e) => {
  const menu = document.getElementById('profile-menu');
  const btn = document.querySelector('.profile-btn');
  if (menu && !menu.classList.contains('hidden')) {
    if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
      menu.classList.add('hidden');
    }
  }
});