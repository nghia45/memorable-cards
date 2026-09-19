# Dev server: static files with caching disabled so edited ES modules always reload.
import http.server, socket, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

class DualStack(http.server.ThreadingHTTPServer):
    # Listen on IPv6 and IPv4: "localhost" resolves to ::1 first on Windows, and an IPv4-only
    # server costs ~200 ms of fallback on every request.
    address_family = socket.AF_INET6
    # socketserver's default listen backlog is 5; on Windows a full backlog refuses connections outright.
    # A phone loading the card through the tunnel opens ~30 at once, so random modules failed to load.
    request_queue_size = 128
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()

DualStack(('::', int(sys.argv[1]) if len(sys.argv) > 1 else 5173), NoCache).serve_forever()
