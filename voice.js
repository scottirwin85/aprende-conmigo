// voice.js — your own recordings of phrases, played instead of the phone's voice.
// Clips live in this browser's IndexedDB, keyed by the phrase's Spanish text,
// and are shared by every profile on the device. Nothing is uploaded.
const Voice = (function () {
  const DB = 'aprende-voice', STORE = 'clips';
  const have = new Set();   // phrases with a clip
  const urls = new Map();   // phrase -> object URL, made on first play
  let dbPromise = null, current = null;

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

  async function init() {
    try { (await run('readonly', st => st.getAllKeys())).forEach(k => have.add(k)); } catch (e) { /* no storage: phone voice only */ }
  }
  const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  async function save(key, blob) {
    await run('readwrite', st => st.put(blob, key));
    have.add(key);
    if (urls.has(key)) { URL.revokeObjectURL(urls.get(key)); urls.delete(key); }
  }
  async function remove(key) {
    await run('readwrite', st => st.delete(key));
    have.delete(key);
    if (urls.has(key)) { URL.revokeObjectURL(urls.get(key)); urls.delete(key); }
  }
  function stop() { if (current) { current.pause(); current = null; } }
  async function play(key, rate) {
    let url = urls.get(key);
    if (!url) {
      const blob = await run('readonly', st => st.get(key));
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

  return { init, has: k => have.has(k), count: () => have.size, save, remove, play, stop, record, canRecord };
})();
