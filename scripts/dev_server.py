#!/usr/bin/env python3
"""
Dev-only static server that serves the repo root with hard-no-cache
headers. Swap this in for `python -m http.server 8765` while reviewing
milestones on devices that cache aggressively (iOS Safari, PWAs).

Usage:  python scripts/dev_server.py [port]
Default port: 8765
"""
import http.server
import socketserver
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    with socketserver.TCPServer(("", port), NoCacheHandler) as httpd:
        print(f"aiStacked dev server on http://0.0.0.0:{port}  (no-cache)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
