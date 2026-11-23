"""Loopback GET-only proxy for testing product/kit links against real public data.

No admin routes, database access, submitted forms or production changes.
The cache lasts only for this process; all upstream data comes from public APIs.
"""
import json
import threading
from collections import Counter
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import urlopen


def main():
    cache = {}
    requests = Counter()
    lock = threading.RLock()

    class Preview(BaseHTTPRequestHandler):
        def do_GET(self):
            path = urlsplit(self.path).path
            if path == "/api/v1/product-ready-kits-test-preview":
                with lock:
                    body = json.dumps({"isolated_public_product_preview": True, "requests": dict(requests)}).encode()
                status, content_type = 200, "application/json"
            elif path in {"/api/v1/ready-kits", "/api/v1/catalog/tree", "/api/v1/products"} or path.startswith("/api/v1/ready-kits/") or path.startswith("/api/v1/products/") or path.startswith("/media/"):
                with lock:
                    requests[path] += 1
                    cached = cache.get(self.path)
                if cached is None:
                    try:
                        with urlopen("https://dimohod-trade.pro" + self.path, timeout=30) as response:
                            cached = response.status, response.headers.get("Content-Type", "application/octet-stream"), response.read()
                    except HTTPError as error:
                        cached = error.code, "application/json", error.read()
                    with lock:
                        cache[self.path] = cached
                status, content_type, body = cached
            else:
                status, content_type, body = 404, "application/json", b'{"detail":"Public product preview only"}'
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    print("GET-only public product preview: 127.0.0.1:8129", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 8129), Preview).serve_forever()


if __name__ == "__main__":
    main()
