// profiles.js — who's practising. Profiles live on this device only: a name,
// an optional 4-digit PIN, and their own progress (storage.js keeps each
// profile's keys separate). The PIN only stops someone opening the wrong
// profile by accident — it isn't a password and doesn't encrypt anything.
// Depends on storage.js (Storage) and content.js (iconSvg).
const Profiles = (function () {
  const KEY = 'profiles';
  const PROFILE_KEYS = ['progress', 'streak', 'unlocked', 'challenges', 'prefs', 'custom'];
  const COLORS = ['#1B6B78', '#6B2545', '#C7832A', '#4F7A3A', '#2B2320'];
  const MAX_NAME = 20;

  let data = { list: [], active: null };
  let onEnter = null;   // app callback, called with the profile once someone is in
  let entered = null;   // profile currently in use
  let menuListener = false;
  let extraMenu = [];   // [{id, label, onClick}] added by the app (recordings, my phrases, progress)

  const $ = id => document.getElementById(id);
  function esc(s) {
    return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  // Not security (4 digits can be guessed) — just avoids storing the PIN as typed.
  function hashPin(pin, salt) {
    let h = 2166136261;
    const str = salt + ':' + pin;
    for (let round = 0; round < 500; round++) {
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      h ^= round;
    }
    return (h >>> 0).toString(16);
  }
  function makePin(pin) {
    const salt = Math.random().toString(36).slice(2, 10);
    return { salt, hash: hashPin(pin, salt) };
  }
  function pinMatches(profile, pin) { return !!profile.pin && profile.pin.hash === hashPin(pin, profile.pin.salt); }
  const validPin = pin => /^\d{4}$/.test(pin);
  const cleanName = name => String(name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

  async function load() {
    try {
      const raw = JSON.parse((await Storage.getGlobal(KEY)) || 'null');
      if (raw && Array.isArray(raw.list)) {
        data.list = raw.list.filter(p => p && /^[a-z0-9]{1,24}$/.test(p.id) && cleanName(p.name))
          .map(p => ({ id: p.id, name: cleanName(p.name), color: COLORS.includes(p.color) ? p.color : COLORS[0],
                       pin: p.pin && typeof p.pin.salt === 'string' && typeof p.pin.hash === 'string' ? { salt: p.pin.salt, hash: p.pin.hash } : null }));
        data.active = data.list.some(p => p.id === raw.active) ? raw.active : null;
      }
    } catch (e) { /* start fresh */ }
  }
  function save() { Storage.setGlobal(KEY, JSON.stringify(data)); }
  function byId(id) { return data.list.find(p => p.id === id) || null; }

  // The first profile takes over any progress saved before profiles existed.
  function newId() {
    if (!data.list.length) return 'default';
    let id;
    do { id = Math.random().toString(36).slice(2, 10); } while (byId(id) || id === 'default');
    return id;
  }
  async function hasLegacyProgress() {
    return !data.list.length && !!(await Storage.getGlobal('progress'));
  }

  function avatar(p, cls) {
    return '<span class="avatar ' + (cls || '') + '" style="background:' + p.color + '" aria-hidden="true">' +
      esc(p.name.charAt(0).toUpperCase()) + '</span>';
  }

  // ---- screens (shown in #login while #main is hidden) ----
  function showScreen(html) {
    $('main').hidden = true;
    if ($('panel')) $('panel').hidden = true;
    const el = $('login');
    el.hidden = false;
    el.innerHTML = '<div class="login-card">' + html + '</div>';
    window.scrollTo(0, 0);
  }

  async function showWelcome() {
    const legacy = await hasLegacyProgress();
    showScreen(
      '<div class="eyebrow">Aprende Conmigo</div>' +
      '<h1 class="login-title">¡Hola! ¿Cómo te llamas?</h1>' +
      '<p class="login-sub">What’s your name? It’s only kept on this device, to greet you and keep your progress separate.</p>' +
      formFields(null) +
      (legacy ? '<p class="login-note">The progress already on this device will be kept in your profile.</p>' : '') +
      '<button class="ctrl-btn primary login-btn" id="saveProfileBtn">Empezar · Start</button>');
    wireForm(null);
  }

  function showPicker() {
    entered = null;
    showScreen(
      '<div class="eyebrow">Aprende Conmigo</div>' +
      '<h1 class="login-title">¿Quién va a practicar?</h1>' +
      '<p class="login-sub">Who’s going to practise?</p>' +
      '<div class="profile-grid">' +
        data.list.map(p => '<button class="profile-pick" data-id="' + p.id + '">' + avatar(p, 'avatar-lg') +
          '<span class="profile-name">' + esc(p.name) + '</span>' + (p.pin ? '<span class="profile-lock">🔒 PIN</span>' : '') + '</button>').join('') +
        '<button class="profile-pick profile-add" id="addProfileBtn"><span class="avatar avatar-lg avatar-add" aria-hidden="true">+</span>' +
          '<span class="profile-name">Add a profile</span></button>' +
      '</div>');
    document.querySelectorAll('.profile-pick[data-id]').forEach(b => { b.onclick = () => choose(byId(b.dataset.id)); });
    $('addProfileBtn').onclick = () => showForm(null);
  }

  function choose(p) { if (p.pin) showPin(p); else enter(p); }

  function showPin(p) {
    entered = null;
    showScreen(
      '<div class="login-center">' + avatar(p, 'avatar-xl') +
      '<h1 class="login-title">¡Hola, ' + esc(p.name) + '!</h1>' +
      '<p class="login-sub">Enter your 4-digit PIN.</p>' +
      '<input class="pin-input" id="pinInput" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="PIN">' +
      '<div class="login-error" id="pinError" role="alert"></div>' +
      '<button class="ctrl-btn primary login-btn" id="pinBtn">Entrar · Go in</button>' +
      '<div class="login-links"><button class="link-btn" id="switchBtn">Not ' + esc(p.name) + '? Switch profile</button>' +
      '<button class="link-btn" id="forgotBtn">Forgot PIN?</button></div>' +
      '<div class="login-note" id="forgotNote" hidden>A forgotten PIN can’t be recovered — it’s only stored on this device. ' +
        'You can delete this profile and start a new one; its progress will be lost. ' +
        '<button class="link-btn danger" id="forgotDeleteBtn">Delete ' + esc(p.name) + '’s profile</button></div>' +
      '</div>');
    const input = $('pinInput');
    const tryPin = () => {
      if (pinMatches(p, input.value)) enter(p);
      else { $('pinError').textContent = 'That PIN isn’t right. Try again.'; input.value = ''; input.focus(); }
    };
    $('pinBtn').onclick = tryPin;
    input.oninput = () => { $('pinError').textContent = ''; if (input.value.length === 4) tryPin(); };
    input.onkeydown = e => { if (e.key === 'Enter') tryPin(); };
    $('switchBtn').onclick = showPicker;
    $('forgotBtn').onclick = () => { $('forgotNote').hidden = false; };
    confirmTwice($('forgotDeleteBtn'), 'Tap again to delete ' + p.name + '’s progress', () => remove(p));
    input.focus();
  }

  // ---- create / edit ----
  function formFields(p) {
    return '<label class="field"><span>Name</span>' +
        '<input id="nameInput" type="text" maxlength="' + MAX_NAME + '" autocomplete="given-name" value="' + (p ? esc(p.name) : '') + '"></label>' +
      '<label class="field"><span>' + (p && p.pin ? 'New PIN (leave blank to keep the current one)' : 'PIN (optional, 4 digits)') + '</span>' +
        '<input id="pinSet" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"></label>' +
      (p && p.pin ? '<label class="check"><input type="checkbox" id="removePin"> Remove PIN</label>' : '') +
      '<div class="login-error" id="formError" role="alert"></div>';
  }

  function showForm(p) {
    showScreen(
      '<h1 class="login-title">' + (p ? 'Edit profile' : 'New profile') + '</h1>' +
      formFields(p) +
      '<button class="ctrl-btn primary login-btn" id="saveProfileBtn">' + (p ? 'Save' : 'Create profile') + '</button>' +
      '<button class="ctrl-btn login-btn" id="cancelBtn">Cancel</button>' +
      (p ? '<button class="link-btn danger delete-profile" id="deleteBtn">Delete this profile</button>' : ''));
    wireForm(p);
    $('cancelBtn').onclick = () => { if (p && entered) enter(entered); else if (data.list.length) showPicker(); else showWelcome(); };
    if (p) confirmTwice($('deleteBtn'), 'Tap again to delete ' + p.name + ' and all their progress', () => remove(p));
  }

  function wireForm(p) {
    const submit = () => {
      const name = cleanName($('nameInput').value);
      const pin = $('pinSet').value;
      const removePin = !!($('removePin') && $('removePin').checked);
      if (!name) return fail('Please enter a name.');
      if (data.list.some(o => o !== p && o.name.toLowerCase() === name.toLowerCase())) return fail('There’s already a profile called ' + name + '.');
      if (pin && !validPin(pin)) return fail('The PIN needs to be exactly 4 digits.');
      if (p) {
        p.name = name;
        if (removePin) p.pin = null; else if (pin) p.pin = makePin(pin);
        save();
        enter(p);
      } else {
        const created = { id: newId(), name, color: COLORS[data.list.length % COLORS.length], pin: pin ? makePin(pin) : null };
        data.list.push(created);
        save();
        enter(created);
      }
    };
    const fail = msg => { $('formError').textContent = msg; };
    $('saveProfileBtn').onclick = submit;
    $('nameInput').onkeydown = e => { if (e.key === 'Enter') submit(); };
    $('nameInput').focus();
  }

  // Two-tap confirm (confirm() dialogs don't show in some app web views).
  function confirmTwice(btn, prompt, action) {
    let armed = false;
    btn.onclick = () => {
      if (armed) return action();
      armed = true;
      btn.textContent = prompt;
      btn.classList.add('armed');
    };
  }

  async function remove(p) {
    Storage.useProfile(p.id);
    await Promise.all(PROFILE_KEYS.map(k => Storage.set(k, '')));
    data.list = data.list.filter(o => o !== p);
    if (data.active === p.id) data.active = null;
    save();
    if (data.list.length) showPicker(); else showWelcome();
  }

  // ---- in the app ----
  async function enter(p) {
    data.active = p.id;
    save();
    entered = p;
    Storage.useProfile(p.id);
    $('login').hidden = true;
    $('login').innerHTML = '';
    $('main').hidden = false;
    renderChip();
    if (onEnter) await onEnter(p);
  }

  function renderChip() {
    const el = $('profileChip');
    if (!entered) { el.innerHTML = ''; return; }
    el.innerHTML =
      '<button class="profile-chip" id="chipBtn" aria-haspopup="true" aria-expanded="false">' + avatar(entered) +
        '<span>' + esc(entered.name) + '</span></button>' +
      '<div class="profile-menu" id="profileMenu" hidden>' +
        '<button id="menuSwitch">Switch profile</button>' +
        extraMenu.map(m => '<button id="' + m.id + '">' + esc(m.label) + '</button>').join('') +
        '<button id="menuEdit">Edit name or PIN</button>' +
        '<button id="menuLogout" class="menu-logout">Log out</button>' +
      '</div>';
    const menu = $('profileMenu'), btn = $('chipBtn');
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.onclick = e => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      btn.setAttribute('aria-expanded', String(!menu.hidden));
    };
    if (!menuListener) {
      menuListener = true;
      document.addEventListener('click', e => {
        const m = $('profileMenu');
        if (m && !$('profileChip').contains(e.target)) { m.hidden = true; if ($('chipBtn')) $('chipBtn').setAttribute('aria-expanded', 'false'); }
      });
    }
    $('menuSwitch').onclick = () => { close(); showPicker(); };
    $('menuEdit').onclick = () => { close(); showForm(entered); };
    $('menuLogout').onclick = () => { close(); logout(); };
    extraMenu.forEach(m => { $(m.id).onclick = () => { close(); m.onClick(); }; });
  }

  // Unlike "Switch profile", nobody is remembered: the next launch asks who's practising.
  function logout() {
    if (window.speechSynthesis) try { window.speechSynthesis.cancel(); } catch (e) {}
    data.active = null;
    save();
    showPicker();
  }

  async function start(callback) {
    onEnter = callback;
    await load();
    const p = byId(data.active);
    if (!data.list.length) await showWelcome();
    else if (p && !p.pin) await enter(p);   // same person as last time: straight in
    else if (p) showPin(p);
    else showPicker();
  }

  function setMenu(items) { extraMenu = items; renderChip(); }

  return { start, logout, setMenu, current: () => entered };
})();
