#!/usr/bin/env bash
# Vérifie un déploiement de LexIA de bout en bout, à travers nginx.
# Utilisation : scripts/smoke_test.sh [http://localhost:8080]
set -euo pipefail

BASE="${1:-http://localhost:8080}"
EMAIL="smoke-$(date +%s)@lexia.test"
PASSWORD="Smoke-test-2026!"
failures=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    echo "  OK    $label"
  else
    echo "  ÉCHEC $label — attendu « $expected », obtenu « ${actual:0:200} »"
    failures=$((failures + 1))
  fi
}

status() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

echo "Vérification de $BASE"

echo "Frontend (nginx)"
check "page d'accueil" '<div id="root">' "$(curl -s "$BASE/")"
check "route de l'application (/dashboard) servie par index.html" "200" "$(status "$BASE/dashboard")"
headers=$(curl -s -D - -o /dev/null "$BASE/")
check "en-tête Content-Security-Policy" "content-security-policy: default-src 'self'" "${headers,,}"
check "en-tête X-Frame-Options" "x-frame-options: deny" "${headers,,}"
check "version de nginx masquée" "masquée" "$([[ "${headers,,}" == *"server: nginx/"* ]] && echo visible || echo masquée)"

echo "Backend (gunicorn via nginx)"
check "santé du service" '"status": "ok"' "$(curl -s "$BASE/api/health/")"
check "17 catégories juridiques" '"slug": "travail"' "$(curl -s "$BASE/api/categories/" | sed 's/":"/": "/g')"
check "admin Django" "200" "$(status "$BASE/admin/login/")"
css=$(curl -s "$BASE/admin/login/" | grep -o '/static/admin/css/[^"]*\.css' | head -1)
check "fichiers statiques de l'admin (whitenoise)" "200" "$(status "$BASE$css")"

echo "Comptes et sécurité"
check "inscription" "201" "$(status -X POST "$BASE/api/auth/register/" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"first_name\":\"Smoke\",\"last_name\":\"Test\",\"password\":\"$PASSWORD\"}")"
token=$(curl -s -X POST "$BASE/api/auth/login/" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | sed -E 's/.*"access":"([^"]+)".*/\1/')
check "connexion et profil" "$EMAIL" "$(curl -s "$BASE/api/auth/me/" -H "Authorization: Bearer $token")"
check "lois importées" '"count":' "$(curl -s "$BASE/api/laws/" -H "Authorization: Bearer $token")"
check "API protégée sans jeton" "401" "$(status "$BASE/api/conversations/")"
check "dashboard réservé aux admins" "403" "$(status "$BASE/api/dashboard/stats/" -H "Authorization: Bearer $token")"
check "erreur sans détail de configuration (DEBUG désactivé)" "momentanément indisponible" \
  "$(curl -s -X POST "$BASE/api/chat/stream/" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"message":"Bonjour"}')"

codes=""
for _ in $(seq 1 11); do
  codes+="$(status -X POST "$BASE/api/auth/login/" -H 'Content-Type: application/json' -d '{"email":"x@lexia.test","password":"faux"}') "
done
check "limite de tentatives de connexion (429 au 11e essai)" "429" "$codes"

echo
if [[ $failures -gt 0 ]]; then
  echo "$failures vérification(s) en échec."
  exit 1
fi
echo "Toutes les vérifications sont passées."
