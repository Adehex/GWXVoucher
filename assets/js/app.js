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

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', function () {
  if (!auth || !db) {
    document.getElementById('auth-subtitle').textContent = "FIREBASE CONFIG MISSING. See assets/js/firebase-config.js";
    showToast("Firebase Config Missing", "error");
    return;
  }

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = { email: user.email, displayName: user.displayName || user.email.split('@')[0], uid: user.uid };
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app-screen').style.display = 'flex';
      document.getElementById('f-prepared').value = currentUser.displayName;
      loadUserHistory();
    } else {
      currentUser = null;
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
});

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
  if (mode === 'signup') {
    document.getElementById('form-signin').classList.add('hidden');
    document.getElementById('form-signup').classList.remove('hidden');
    document.getElementById('auth-subtitle').textContent = "Create an account to continue";
  } else {
    document.getElementById('form-signup').classList.add('hidden');
    document.getElementById('form-signin').classList.remove('hidden');
    document.getElementById('auth-subtitle').textContent = "Please sign in to continue";
  }
}

async function handleSignIn() {
  if (!auth) return showToast("Firebase Config Missing", "error");
  const email = document.getElementById('signin-email').value.trim();
  const pass = document.getElementById('signin-password').value.trim();
  
  if (!email || !pass) return showToast("Please fill in all sign-in fields.", 'error');
  
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    showToast(`Welcome back!`);
  } catch (err) {
    showToast(err.message, 'error');
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
  ['f-manager','f-account','f-amount-words',
   'f-audit','f-approved','f-head','f-coo','f-md'].forEach(id => {
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
      await vouchersRef.add(data);
    }
    resetForm();
    renderItems();
    showToast('✓ Voucher saved to cloud!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Error saving voucher.', 'error');
  }
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (history.length === 0) {
    container.innerHTML = '<div class="history-empty">No vouchers saved yet. Fill the form and click Save.</div>';
    updatePrintCount();
    return;
  }
  container.innerHTML = history.map(v => {
    const isSelected = selectedIds.includes(v.id);
    const total = v.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    return `<div class="history-item ${isSelected ? 'selected' : ''}" onclick="toggleSelect('${v.id}')">
      <div class="history-check">${isSelected ? '✓' : ''}</div>
      <div class="history-info">
        <div class="history-info-name">${escHtml(v.dept || v.beneficiary || 'Untitled')}</div>
        <div class="history-info-detail">${v.beneficiary ? escHtml(v.beneficiary) + ' · ' : ''}${fmtDate(v.date)} · ₦${fmtNum(total)}</div>
      </div>
      <div class="history-actions">
        <button class="history-btn" onclick="event.stopPropagation(); editFromHistory('${v.id}')" title="Edit">✎</button>
        <button class="history-btn delete" onclick="event.stopPropagation(); deleteFromHistory('${v.id}')" title="Delete">×</button>
      </div>
    </div>`;
  }).join('');
  updatePrintCount();
}

function toggleSelect(id) {
  const idx = selectedIds.indexOf(id);
  if (idx >= 0) {
    selectedIds.splice(idx, 1);
  } else {
    if (selectedIds.length >= 3) {
      showToast('Maximum 3 vouchers can be selected for printing.', 'error');
      return;
    }
    selectedIds.push(id);
  }
  renderHistory();
  renderSelectedPreviews();
}

async function deleteFromHistory(id) {
  if (!db || !currentUser) return;
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
        await vouchersRef.add(currentData);
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
  if (!confirm('Are you sure you want to clear all history? This cannot be undone!')) return;
  
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
  if (selectedIds.length > 0) {
    badge.textContent = selectedIds.length;
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none';
  }
}

function renderSelectedPreviews() {
  for (let i = 1; i <= 3; i++) {
    const selId = selectedIds[i - 1];
    const data = selId ? history.find(v => v.id === selId) : null;
    const html = buildVoucherHTML(data, i);
    document.getElementById(`prev-v${i}`).innerHTML = html;
    document.getElementById(`print-v${i}`).innerHTML = html;
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
    row.className = 'beneficiary-row';
    row.innerHTML = `
      <input class="form-input beneficiary-input" type="text" placeholder="Beneficiary ${i + 1}"
        value="${escHtml(name || '')}"
        oninput="beneficiaries[${i}] = this.value" />
      <button class="remove-item-btn" onclick="removeBeneficiary(${i})" title="Remove">×</button>
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
      <input class="form-input" type="text" placeholder="Description…"
        value="${escHtml(item.desc || '')}"
        oninput="items[${i}].desc = this.value" />
      <input class="form-input" type="number" placeholder="0.00" min="0" step="0.01"
        value="${item.amount || ''}"
        oninput="items[${i}].amount = this.value; recalcTotal()"
        style="text-align:right;font-family:var(--mono);padding-right:7px" />
      <button class="remove-item-btn" onclick="removeItem(${i})" title="Remove">×</button>
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
  'Opay':       { beneficiary: 'Opay Financial Services', account: '8012345678', prepared: 'B. Lawal', audit: 'T. Nwosu', approved: 'D. Afolabi', head: 'R. Ojo', coo: 'E. Abdullahi', md: 'J. Chukwu' },
  'Nis Courier':{ beneficiary: 'NIS Courier Services', account: '0098765432', prepared: 'G. Musa', audit: 'H. Adamu', approved: 'P. Ogundele', head: 'L. Usman', coo: 'N. Babatunde', md: 'V. Salisu' },
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
function printSelected() {
  if (selectedIds.length === 0) {
    showToast('Please select at least one voucher from history to print.', 'error');
    return;
  }
  renderSelectedPreviews();
  window.print();
}

// =============================================
// NUMBER TO WORDS
// =============================================
function numToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function toW(n) {
    n = Math.floor(n);
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n % 100 ? ' ' + toW(n % 100) : '');
    if (n < 1e6)  return toW(Math.floor(n/1000)) + ' Thousand' + (n % 1000 ? ' ' + toW(n % 1000) : '');
    if (n < 1e9)  return toW(Math.floor(n/1e6)) + ' Million' + (n % 1e6 ? ' ' + toW(n % 1e6) : '');
    return toW(Math.floor(n/1e9)) + ' Billion' + (n % 1e9 ? ' ' + toW(n % 1e9) : '');
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
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  void t.offsetWidth; // reflow
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}