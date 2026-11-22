"""Read-only loopback snapshot of the public kits API for accurate design previews.

No database, admin routes, form submissions, emails or production mutations.
Run separately from the writable fixture harness used by CRM regression tests.
"""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from urllib.request import urlopen


def main():
    with urlopen("https://dimohod-trade.pro/api/v1/ready-kits", timeout=30) as response:
        snapshot = json.load(response)
    kits = snapshot["items"]
    if not kits or len({kit["slug"] for kit in kits}) != len(kits):
        raise SystemExit("Public kit snapshot is empty or contains duplicate paths")

    class PublicSnapshot(BaseHTTPRequestHandler):
        def do_GET(self):
            path = urlparse(self.path).path
            code = 200
            if path == "/api/v1/ready-kits":
                data = snapshot
            elif path == "/api/v1/ready-kits-test-preview":
                data = {"isolated_ready_kits_preview": True, "public_read_only_snapshot": True}
            elif path == "/api/v1/catalog/tree":
                data = {"items": []}
            else:
                kit = next((kit for kit in kits if path == "/api/v1/ready-kits/" + kit["slug"]), None)
                if kit:
                    data = {"kit": kit, "variants": kits}
                else:
                    code, data = 404, {"detail": "This read-only preview exposes public kit data only"}
            body = json.dumps(data, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    print(f"Read-only public snapshot: {len(kits)} kits; loopback 127.0.0.1:8129", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 8129), PublicSnapshot).serve_forever()


if __name__ == "__main__":
    main()
