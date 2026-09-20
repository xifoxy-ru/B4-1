"""Run the local static server with a useful port-conflict message."""

import errno
import http.server
import sys


def main() -> int:
    port = int(sys.argv[1])

    try:
        server = http.server.ThreadingHTTPServer(
            ("", port), http.server.SimpleHTTPRequestHandler
        )
    except OSError as error:
        if error.errno != errno.EADDRINUSE:
            raise

        alternate_port = port + 1 if port < 65535 else port - 1
        print(
            f"Port {port} is already in use. "
            f"Check http://localhost:{port} to identify the existing service, "
            f"or start this site with: make serve PORT={alternate_port}",
            file=sys.stderr,
        )
        return 1

    print(f"Serving this site at http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
