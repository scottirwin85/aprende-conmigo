// storage.js — one storage path for every host this app runs in.
//  - Scriptable (iOS): the wrapper injects window.__APRENDE_SCRIPTABLE__ = {store}
//    with the saved progress read from a file, and the page sends changes back
//    through a navigation the wrapper intercepts. localStorage can't be relied on
//    there, because a WebView page loaded from a string has no stable origin.
//  - Claude Artifact host: window.storage.
//  - Anything else (plain browser): localStorage.
// This is what lets the same built spanish-app.html file work unmodified
// in the browser, as a published artifact, and inside Scriptable.
const Storage = (function () {
  const bridge =
    typeof window !== 'undefined' &&
    window.__APRENDE_SCRIPTABLE__ &&
    typeof window.__APRENDE_SCRIPTABLE__.store === 'object' &&
    window.__APRENDE_SCRIPTABLE__.store
      ? window.__APRENDE_SCRIPTABLE__
      : null;

  const hasArtifactStorage =
    !bridge &&
    typeof window !== 'undefined' &&
    window.storage &&
    typeof window.storage.get === 'function' &&
    typeof window.storage.set === 'function';

  function localGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function localSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }

  // Scriptable: debounce, then hand the whole store to the wrapper via a
  // navigation in a throwaway iframe (the wrapper cancels it and writes a file).
  let bridgeTimer = null;
  function scheduleBridgeSave() {
    clearTimeout(bridgeTimer);
    bridgeTimer = setTimeout(function () {
      try {
        const f = document.createElement('iframe');
        f.style.display = 'none';
        f.src = 'aprendeconmigo://save?' + encodeURIComponent(JSON.stringify(bridge.store));
        document.body.appendChild(f);
        setTimeout(function () { f.remove(); }, 1000);
      } catch (e) { /* the wrapper also reads the store when the app closes */ }
    }, 300);
  }

  // Each profile's keys get their own prefix. The first profile ("default")
  // uses the bare keys, so progress saved before profiles existed is theirs.
  let prefix = '';
  function useProfile(id) { prefix = !id || id === 'default' ? '' : 'p:' + id + ':'; }

  async function get(key) { return rawGet(prefix + key); }
  async function set(key, value) { return rawSet(prefix + key, value); }

  async function rawGet(key) {
    if (bridge) {
      if (Object.prototype.hasOwnProperty.call(bridge.store, key)) return bridge.store[key];
      return localGet(key);
    }
    if (hasArtifactStorage) {
      try {
        const res = await window.storage.get(key);
        if (res && res.value != null) return res.value;
      } catch (e) { /* fall through */ }
    }
    // Also covers values written to localStorage after an artifact write failed.
    return localGet(key);
  }

  async function rawSet(key, value) {
    if (bridge) {
      bridge.store[key] = value;
      scheduleBridgeSave();
      localSet(key, value);
      return;
    }
    if (hasArtifactStorage) {
      try { await window.storage.set(key, value); return; } catch (e) { /* fall through */ }
    }
    localSet(key, value);
  }

  return { get, set, getGlobal: rawGet, setGlobal: rawSet, useProfile,
           backend: bridge ? 'scriptable' : hasArtifactStorage ? 'artifact' : 'local' };
})();

// --- manual export / import, since the artifact store, localStorage and
// Scriptable don't share data across devices or apps. This is a deliberate low-tech
// substitute for real sync: no backend, no account system, just a code
// you copy from one place and paste into the other. ---
function encodeProgressBlob(payload) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}
function decodeProgressBlob(blob) {
  return JSON.parse(decodeURIComponent(escape(atob(blob.replace(/\s+/g, '')))));
}
