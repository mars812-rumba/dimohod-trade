"""Loopback-only CONNECT relay for api.anthropic.com:443 over an SSH tunnel.

TLS terminates at Anthropic, not at this relay. No credentials or request bodies
are decrypted, persisted or logged. Other destinations and HTTP methods fail.
"""
import select
import socket
import socketserver


class AnthropicConnectHandler(socketserver.StreamRequestHandler):
    def handle(self):
        self.connection.settimeout(10)
        try:
            line = self.rfile.readline(4097)
            if len(line) > 4096:
                return
            parts = line.split()
            if len(parts) != 3 or parts[0] != b'CONNECT' or parts[1] != b'api.anthropic.com:443':
                self.wfile.write(b'HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
                return
            total = len(line)
            while True:
                header = self.rfile.readline(4097)
                total += len(header)
                if not header or len(header) > 4096 or total > 16384:
                    return
                if header == b'\r\n':
                    break
            with socket.create_connection(('api.anthropic.com', 443), timeout=10) as upstream:
                upstream.settimeout(30)
                self.connection.settimeout(30)
                self.wfile.write(b'HTTP/1.1 200 Connection Established\r\n\r\n')
                self.wfile.flush()
                peers = (self.connection, upstream)
                while True:
                    ready, _, _ = select.select(peers, [], [], 90)
                    if not ready:
                        return
                    for origin in ready:
                        chunk = origin.recv(65536)
                        if not chunk:
                            return
                        destination = upstream if origin is self.connection else self.connection
                        destination.sendall(chunk)
        except OSError:
            return


class AnthropicConnectServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 32


if __name__ == '__main__':
    with AnthropicConnectServer(('127.0.0.1', 18444), AnthropicConnectHandler) as server:
        server.serve_forever()
