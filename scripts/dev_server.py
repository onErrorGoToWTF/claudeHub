#!/usr/bin/env python3
"""
Dev-only static server for aiStacked with:
  - Hard no-cache headers (iOS Safari / PWA friendly).
  - Live reload via Server-Sent Events. A background thread polls mtimes
    under index.html, css/, js/, data/version.json. On any change, every
    connected browser reloads.

Usage:  python scripts/dev_server.py [port]
Default port: 8765

Implementation notes:
  - Uses ThreadingTCPServer so a long-lived SSE connection does not
    block other requests.
  - HTML responses get a single <script> tag injected right before
    </body>. It opens an EventSource to /__reload and calls
    location.reload() on the first 'reload' event.
  - Zero external deps — stdlib only — preserving the zero-dep property
    of this repo.
"""
import http.server
import os
import socketserver
import sys
import threading
import time
from pathlib import Path

# ---------- Repo-root anchoring ----------
REPO_ROOT = Path(__file__).resolve().parent.parent

# Paths whose mtimes we poll. Directories are walked recursively. Anything
# outside this list is ignored (data/latest.json and similar scraper output
# should not trigger reloads during UI dev).
WATCH_PATHS = [
    REPO_ROOT / "index.html",
    REPO_ROOT / "css",
    REPO_ROOT / "js",
    REPO_ROOT / "data" / "version.json",
    REPO_ROOT / "data" / "learn",
]

# Extensions to actually watch inside watched directories. Filters out
# .DS_Store, .swp files, and editor junk that would spam reloads.
WATCH_EXT = {".html", ".css", ".js", ".json", ".md"}

POLL_SECONDS = 0.4  # How fast a change turns into a reload.

INJECTED_SCRIPT = b"""<script>
(function() {
  if (!("EventSource" in window)) return;
  try {
    var es = new EventSource("/__reload");
    es.addEventListener("reload", function() {
      console.log("[dev] reload signal received");
      location.reload();
    });
  } catch (e) { /* no-op */ }
})();
</script>
"""


# ---------- File watcher ----------
class Watcher(threading.Thread):
    """Polls mtimes of WATCH_PATHS. On change, sets every registered client
    Event so each SSE connection wakes up and ships a reload frame."""

    def __init__(self):
        super().__init__(daemon=True)
        self.client_events = set()
        self.lock = threading.Lock()
        self.snapshot = self._scan()

    def register(self):
        ev = threading.Event()
        with self.lock:
            self.client_events.add(ev)
        return ev

    def unregister(self, ev):
        with self.lock:
            self.client_events.discard(ev)

    def _scan(self):
        snap = {}
        for root in WATCH_PATHS:
            if not root.exists():
                continue
            if root.is_file():
                try:
                    snap[str(root)] = root.stat().st_mtime
                except OSError:
                    pass
                continue
            for dirpath, dirnames, filenames in os.walk(root):
                # Skip hidden dirs (.git, .venv, etc.).
                dirnames[:] = [d for d in dirnames if not d.startswith(".")]
                for name in filenames:
                    if name.startswith("."):
                        continue
                    if Path(name).suffix.lower() not in WATCH_EXT:
                        continue
                    p = Path(dirpath) / name
                    try:
                        snap[str(p)] = p.stat().st_mtime
                    except OSError:
                        pass
        return snap

    def run(self):
        while True:
            time.sleep(POLL_SECONDS)
            try:
                current = self._scan()
            except Exception:
                continue
            if current != self.snapshot:
                # Find a representative change to log. Keeps noise low.
                changed = [
                    p for p, t in current.items()
                    if self.snapshot.get(p) != t
                ] + [p for p in self.snapshot if p not in current]
                if changed:
                    rel = os.path.relpath(changed[0], REPO_ROOT)
                    extra = f" (+{len(changed) - 1} more)" if len(changed) > 1 else ""
                    print(f"[dev] change: {rel}{extra} → reloading clients")
                self.snapshot = current
                with self.lock:
                    for ev in list(self.client_events):
                        ev.set()


WATCHER = Watcher()


# ---------- HTTP handler ----------
class DevHandler(http.server.SimpleHTTPRequestHandler):
    # Serve from repo root regardless of cwd.
    def translate_path(self, path):
        # Strip query / fragment first.
        path = path.split("?", 1)[0].split("#", 1)[0]
        # Decode + normalize to a path under REPO_ROOT.
        rel = path.lstrip("/")
        full = (REPO_ROOT / rel).resolve()
        # Defensive: do not escape the repo root.
        try:
            full.relative_to(REPO_ROOT)
        except ValueError:
            return str(REPO_ROOT)
        return str(full)

    def end_headers(self):
        # Only add cache-kill headers for non-SSE responses. SSE writes its
        # own headers directly and skips end_headers().
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    # Quieter access log — one line per request.
    def log_message(self, fmt, *args):
        sys.stderr.write(f"[dev] {self.address_string()} - {fmt % args}\n")

    def do_GET(self):
        if self.path.startswith("/__reload"):
            return self._serve_sse()
        # Intercept HTML responses so we can inject the reload client.
        clean = self.path.split("?", 1)[0].split("#", 1)[0]
        if clean.endswith("/"):
            clean += "index.html"
        fs = self.translate_path(clean)
        if os.path.isdir(fs):
            fs = os.path.join(fs, "index.html")
        if fs.endswith(".html") and os.path.isfile(fs):
            return self._serve_html_with_inject(fs)
        return super().do_GET()

    def _serve_html_with_inject(self, fs_path):
        try:
            with open(fs_path, "rb") as f:
                body = f.read()
        except OSError:
            self.send_error(404)
            return
        if b"</body>" in body:
            body = body.replace(b"</body>", INJECTED_SCRIPT + b"</body>", 1)
        else:
            body = body + INJECTED_SCRIPT
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _serve_sse(self):
        # Server-Sent Events stream. One client per connection.
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        # Explicitly no end_headers() cache-kill addition — we already set what we want.
        self.wfile.write(b"\r\n")
        self.wfile.flush()
        ev = WATCHER.register()
        try:
            # Send an immediate hello so the client knows we're connected.
            self.wfile.write(b": connected\n\n")
            self.wfile.flush()
            while True:
                fired = ev.wait(timeout=15)
                if fired:
                    ev.clear()
                    try:
                        self.wfile.write(b"event: reload\ndata: 1\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
                else:
                    # Heartbeat so proxies / iOS do not kill the idle socket.
                    try:
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
        finally:
            WATCHER.unregister(ev)


class ThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    WATCHER.start()
    with ThreadingServer(("", port), DevHandler) as httpd:
        print(f"aiStacked dev server on http://0.0.0.0:{port}  (no-cache + live-reload)")
        print(f"[dev] watching: {', '.join(str(p.relative_to(REPO_ROOT)) for p in WATCH_PATHS)}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
