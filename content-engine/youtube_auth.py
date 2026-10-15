"""Da eseguire UNA volta sul tuo computer per ottenere il YT_REFRESH_TOKEN.

  python content-engine/youtube_auth.py ID_CLIENT SECRET_CLIENT

Si apre il browser, accedi con l'account del canale, autorizzi, e il token viene stampato qui.
"""

import http.server
import sys
import urllib.parse
import webbrowser

import requests

PORT = 8765
REDIRECT = f"http://127.0.0.1:{PORT}"
SCOPES = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    client_id, client_secret = sys.argv[1], sys.argv[2]
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": client_id, "redirect_uri": REDIRECT, "response_type": "code",
        "scope": SCOPES, "access_type": "offline", "prompt": "consent",
    })
    code_box = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            code_box["code"] = query.get("code", [""])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("Fatto! Puoi chiudere questa pagina.".encode())

        def log_message(self, *args):
            pass

    print(f"Apro il browser. Se non si apre, visita:\n{url}\n")
    webbrowser.open(url)
    server = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    while "code" not in code_box:
        server.handle_request()

    resp = requests.post("https://oauth2.googleapis.com/token", data={
        "code": code_box["code"], "client_id": client_id, "client_secret": client_secret,
        "redirect_uri": REDIRECT, "grant_type": "authorization_code",
    }, timeout=30)
    resp.raise_for_status()
    token = resp.json().get("refresh_token")
    if not token:
        sys.exit("Nessun refresh token ricevuto: revoca l'accesso su myaccount.google.com/permissions e riprova.")
    print("YT_REFRESH_TOKEN =", token)
    print("\nCopialo nei Secrets del repository GitHub (Settings → Secrets and variables → Actions).")


if __name__ == "__main__":
    main()
