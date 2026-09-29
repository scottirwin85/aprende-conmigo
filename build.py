#!/usr/bin/env python3
"""Bundles the split source files into three runtime deliverables:
   dist/site/                 — the website GitHub Pages publishes (index.html + icons + manifest)
   dist/spanish-app.html      — single self-contained file (open in any browser / Claude Artifact)
   dist/Aprende Conmigo.js    — that same file, wrapped for Scriptable (iOS, optional)
No build tools required beyond python3's standard library.
"""
import base64, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")
os.makedirs(DIST, exist_ok=True)

HOST_MARKER = "<!--HOST-BOOTSTRAP-->"

def read(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return f.read()

def replace_once(text, old, new, what):
    # Fail loudly instead of silently shipping a file that still points at
    # external styles.css / *.js files (which wouldn't exist next to it).
    if text.count(old) != 1:
        sys.exit("build.py: couldn't find the %s in index.html exactly once — "
                 "did its markup change? Expected:\n%s" % (what, old))
    return text.replace(old, new)

css = read("styles.css")
js = "\n".join([read("content.js"), read("storage.js"), read("srs.js"), read("challenges.js"), read("app.js")])
if "</script" in js.lower():
    sys.exit("build.py: a source file contains '</script', which would end the inline script early.")

shell = read("index.html")
if shell.count(HOST_MARKER) != 1:
    sys.exit("build.py: index.html must contain %s exactly once (the Scriptable wrapper uses it)." % HOST_MARKER)
# swap the <link rel=stylesheet> for an inline <style>, and the <script src>
# tags for one inline <script>, so the result is a single self-contained file.
shell = replace_once(shell,
    '<link rel="stylesheet" href="styles.css">',
    "<style>\n" + css + "\n</style>",
    "stylesheet link")
shell = replace_once(shell,
    '<script src="content.js"></script>\n'
    '<script src="storage.js"></script>\n'
    '<script src="srs.js"></script>\n'
    '<script src="challenges.js"></script>\n'
    '<script src="app.js"></script>',
    "<script>\n" + js + "\n</script>",
    "five <script src> tags")

bundled_path = os.path.join(DIST, "spanish-app.html")
with open(bundled_path, "w", encoding="utf-8") as f:
    f.write(shell)
print("wrote", bundled_path, len(shell), "bytes")

# --- website (GitHub Pages) ---
# Same page as index.html, plus the Home Screen icon and web app manifest it links to.
SITE = os.path.join(DIST, "site")
shutil.rmtree(SITE, ignore_errors=True)
os.makedirs(SITE)
with open(os.path.join(SITE, "index.html"), "w", encoding="utf-8") as f:
    f.write(shell)
shutil.copytree(os.path.join(HERE, "icons"), os.path.join(SITE, "icons"))
shutil.copy(os.path.join(HERE, "manifest.webmanifest"), SITE)
print("wrote", SITE)

# --- Scriptable wrapper ---
# The page's localStorage isn't reliable inside Scriptable's WebView, so the
# wrapper keeps progress in a file: it injects the saved store into the page
# (at HOST_MARKER) before loading, and storage.js sends every change back via an
# "aprendeconmigo://save?..." request that the wrapper intercepts and writes to disk.
b64 = base64.b64encode(shell.encode("utf-8")).decode("ascii")

scriptable = '''// Aprende Conmigo — Spanish learning app
// Scriptable script. Run it directly, or add a widget:
// long-press Home Screen > add widget > Scriptable > pick this script.
// Tapping the widget opens the full app in a WebView.
// Regenerate this file by re-running build.py after editing the source files —
// never hand-edit the HTML_B64 constant below.

const HTML_B64 = "__HTML_B64__";
const HOST_MARKER = "__HOST_MARKER__";

// Progress lives in Scriptable's iCloud folder when iCloud is on, so it
// survives deleting/reinstalling Scriptable; otherwise in its local folder.
const STORE_NAME = "aprende-conmigo-progress.json";
const localFm = FileManager.local();
const LOCAL_PATH = localFm.joinPath(localFm.documentsDirectory(), STORE_NAME);
let fm = localFm, STORE_PATH = LOCAL_PATH;
try {
  const cloudFm = FileManager.iCloud();
  STORE_PATH = cloudFm.joinPath(cloudFm.documentsDirectory(), STORE_NAME);
  fm = cloudFm;
} catch (e) { console.warn("iCloud unavailable, saving progress on this device only."); }

function readJson(manager, path) {
  try {
    if (manager.fileExists(path)) {
      const obj = JSON.parse(manager.readString(path));
      if (obj && typeof obj === "object") return obj;
    }
  } catch (e) { console.warn("Couldn't read saved progress: " + e); }
  return null;
}

async function loadStore() {
  if (fm !== localFm && fm.fileExists(STORE_PATH) && !fm.isFileDownloaded(STORE_PATH)) {
    try { await fm.downloadFileFromiCloud(STORE_PATH); }
    catch (e) { console.warn("Couldn't download progress from iCloud: " + e); }
  }
  const saved = readJson(fm, STORE_PATH);
  if (saved) return saved;
  // First run with iCloud: bring across progress saved locally by an earlier version.
  return (fm !== localFm && readJson(localFm, LOCAL_PATH)) || {};
}

function saveStore(obj) {
  if (!obj || typeof obj !== "object") return;
  try { fm.writeString(STORE_PATH, JSON.stringify(obj)); }
  catch (e) { console.error("Couldn't save progress: " + e); }
}

async function presentApp() {
  const store = await loadStore();
  const boot = "<script>window.__APRENDE_SCRIPTABLE__ = { store: " +
    JSON.stringify(store).replace(/</g, "\\\\u003c") + " };</script>";
  const html = Data.fromBase64String(HTML_B64).toRawString().replace(HOST_MARKER, () => boot); // function form: no "$" patterns

  const wv = new WebView();
  wv.shouldAllowRequest = (request) => {
    const url = request.url || "";
    if (url.indexOf("aprendeconmigo://save") === 0) {
      try { saveStore(JSON.parse(decodeURIComponent(url.slice(url.indexOf("?") + 1)))); }
      catch (e) { console.error("Bad save request: " + e); }
      return false;
    }
    return true;
  };
  await wv.loadHTML(html, "https://aprende-conmigo.local/");
  await wv.present(true); // true = fullscreen modal

  // Backup: read the final state once the app is closed, in case the last
  // debounced save hadn't gone through yet.
  try {
    const json = await wv.evaluateJavaScript(
      "JSON.stringify((window.__APRENDE_SCRIPTABLE__ || {}).store || null)");
    const obj = JSON.parse(json);
    if (obj) saveStore(obj);
  } catch (e) { /* the per-change saves above already have it */ }
}

if (config.runsInWidget) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#FBF3E7");
  widget.url = URLScheme.forRunningScript();

  const title = widget.addText("Aprende Conmigo");
  title.font = Font.boldSystemFont(16);
  title.textColor = new Color("#2B2320");

  widget.addSpacer(4);
  const sub = widget.addText("Tap to practice Spanish");
  sub.font = Font.systemFont(12);
  sub.textColor = new Color("#6B2545");

  Script.setWidget(widget);
  Script.complete();
} else {
  await presentApp();
  Script.complete();
}
'''.replace("__HTML_B64__", b64).replace("__HOST_MARKER__", HOST_MARKER)

scriptable_path = os.path.join(DIST, "Aprende Conmigo.js")
with open(scriptable_path, "w", encoding="utf-8") as f:
    f.write(scriptable)
print("wrote", scriptable_path, len(scriptable), "bytes")
