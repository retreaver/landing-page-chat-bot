#!/usr/bin/env python3
"""Serve the landing page over https://localhost:8443 for local development.

The Retreaver JS API is requested with the same scheme as the page, and
api.routingapi.com is effectively https-only (its HSTS policy makes browsers
upgrade http requests, which breaks CORS preflights). Serving the page over
https keeps local development identical to production.

A self-signed certificate is generated on first run (requires openssl).
Your browser will warn about it once — choose Advanced -> Proceed.
"""
import functools
import http.server
import pathlib
import ssl
import subprocess

PORT = 8443
ROOT = pathlib.Path(__file__).resolve().parent
CERT_DIR = ROOT / ".local-certs"
CERT = CERT_DIR / "localhost.pem"
KEY = CERT_DIR / "localhost-key.pem"

if not (CERT.exists() and KEY.exists()):
    CERT_DIR.mkdir(exist_ok=True)
    subprocess.run(
        [
            "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
            "-keyout", str(KEY), "-out", str(CERT), "-days", "365",
            "-subj", "/CN=localhost",
            "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
        ],
        check=True,
    )

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(CERT, KEY)

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
httpd = http.server.ThreadingHTTPServer(("", PORT), handler)
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print(f"Serving {ROOT}")
print()
print(f"  Landing page:  https://localhost:{PORT}/")
print(f"  Debug mode:    https://localhost:{PORT}/?debug=1")
print()
print("Use the landing page URL to click through the chat as a visitor would.")
print("Use the debug URL while editing configuration.js — it shows the Retreaver")
print("tags collected so far in an orange banner at the top of the page.")
httpd.serve_forever()
