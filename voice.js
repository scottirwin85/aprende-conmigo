// voice.js — your own recordings of phrases, played instead of the phone's voice.
// Clips live in this browser's IndexedDB, keyed by the phrase's Spanish text
// with the profile's prefix (like storage.js), so each profile has its own.
// The first profile ("default") uses bare keys, which keeps clips recorded
// before recordings were per profile. Nothing is uploaded.
const Voice = (function () {
  const DB = 'aprende-voice', STORE = 'clips';
  const have = new Set();   // phrases with a clip
  const urls = new Map();   // phrase -> object URL, made on first play
  let dbPromise = null, current = null;
  let prefix = '', loaded = Promise.resolve();
  const isOther = k => /^p:[a-z0-9]+:/.test(k); // another (non-default) profile's clip
  const full = key => prefix + key;

  function open() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('no IndexedDB'));
    dbPromise = dbPromise || new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  function run(mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
    }));
  }

  // Loads which phrases the given profile has recorded.
  function useProfile(id) {
    prefix = !id || id === 'default' ? '' : 'p:' + id + ':';
    stop();
    have.clear();
    urls.forEach(u => URL.revokeObjectURL(u));
    urls.clear();
    const want = prefix;
    loaded = run('readonly', st => st.getAllKeys()).then(keys => {
      if (want !== prefix) return;
      keys.forEach(k => {
        if (want ? k.startsWith(want) : !isOther(k)) have.add(want ? k.slice(want.length) : k);
      });
    }).catch(() => { /* no storage: phone voice only */ });
    return loaded;
  }
  const init = () => useProfile('default');
  // Deletes every clip a profile recorded (when the profile is deleted).
  async function removeProfile(id) {
    const pre = !id || id === 'default' ? '' : 'p:' + id + ':';
    try {
      const keys = await run('readonly', st => st.getAllKeys());
      const mine = keys.filter(k => pre ? k.startsWith(pre) : !isOther(k));
      if (mine.length) await run('readwrite', st => { mine.forEach(k => st.delete(k)); return null; });
      if (pre === prefix) { have.clear(); urls.forEach(u => URL.revokeObjectURL(u)); urls.clear(); }
    } catch (e) { /* nothing stored */ }
  }
  const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  async function save(key, blob) {
    await run('readwrite', st => st.put(blob, full(key)));
    have.add(key);
    if (urls.has(key)) { URL.revokeObjectURL(urls.get(key)); urls.delete(key); }
  }
  async function remove(key) {
    await run('readwrite', st => st.delete(full(key)));
    have.delete(key);
    if (urls.has(key)) { URL.revokeObjectURL(urls.get(key)); urls.delete(key); }
  }
  function stop() { if (current) { current.pause(); current = null; } }
  async function play(key, rate) {
    let url = urls.get(key);
    if (!url) {
      const blob = await run('readonly', st => st.get(full(key)));
      if (!blob) throw new Error('missing clip');
      url = URL.createObjectURL(blob);
      urls.set(key, url);
    }
    stop();
    current = new Audio(url);
    current.playbackRate = rate || 1;
    await current.play();
  }

  // Starts recording; resolves to an object whose stop() resolves to the clip.
  // Stops by itself after maxMs.
  async function record(maxMs) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
      .find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(resolve => {
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        resolve(new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' }));
      };
    });
    rec.start();
    const timer = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, maxMs || 8000);
    return {
      stop() { clearTimeout(timer); if (rec.state === 'recording') rec.stop(); return done; },
      done,
    };
  }

  return { init, useProfile, removeProfile, ready: () => loaded, has: k => have.has(k), count: () => have.size, save, remove, play, stop, record, canRecord };
})();
