"""Test de charge de l'API LexIA.

Simule des utilisateurs simultanés qui consultent l'API (profil, conversations, catégories,
lois, articles), puis mesure le temps de réponse de vraies questions au chatbot (critère CR8 :
moins de 3 secondes, mesuré sur 10 requêtes consécutives).

Le serveur doit être lancé avec des limites de requêtes relevées, sinon les inscriptions et
connexions du test seront bloquées (429) :

    set THROTTLE_LOGIN=10000/min & set THROTTLE_REGISTER=10000/hour & set THROTTLE_CHAT=10000/hour

Utilisation :

    python scripts/load_test.py --users 20 --duration 30 --chat 10
"""

import argparse
import asyncio
import random
import statistics
import time
import uuid
from collections import defaultdict

import httpx

PASSWORD = "Charge-test-2026!"
QUESTIONS = [
    "Combien de membres faut-il pour créer une coopérative ?",
    "واش نقدر نتبرع بكلية لخويا؟",
    "ما هي شروط تأسيس حزب سياسي؟",
    "Faut-il un permis pour construire une maison ?",
    "Quelles sont les conditions pour devenir expert judiciaire ?",
    "Quels sont les pouvoirs du Roi selon la Constitution ?",
    "Comment est protégé le consommateur en cas de produit défectueux ?",
    "ما هي حقوق الأجير في حالة الطرد التعسفي؟",
    "Quelle est la durée de protection des droits d'auteur ?",
    "ما هي شروط الحصول على جواز السفر البيومتري؟",
]


class Stats:
    def __init__(self):
        self.latencies: dict[str, list[float]] = defaultdict(list)
        self.errors: dict[str, int] = defaultdict(int)

    def record(self, name: str, seconds: float, ok: bool):
        self.latencies[name].append(seconds)
        if not ok:
            self.errors[name] += 1


def percentile(values: list[float], p: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(len(ordered) * p))]


async def timed(client: httpx.AsyncClient, stats: Stats, name: str, method: str, url: str, **kwargs):
    start = time.perf_counter()
    try:
        response = await client.request(method, url, **kwargs)
        ok = response.status_code < 400
    except httpx.HTTPError:
        response, ok = None, False
    stats.record(name, time.perf_counter() - start, ok)
    return response


async def virtual_user(base: str, stats: Stats, deadline: float):
    async with httpx.AsyncClient(base_url=base, timeout=30) as client:
        email = f"charge-{uuid.uuid4().hex[:10]}@lexia.test"
        await timed(client, stats, "POST /auth/register", "POST", "/api/auth/register/", json={
            "email": email, "first_name": "Charge", "last_name": "Test", "password": PASSWORD,
        })
        login = await timed(client, stats, "POST /auth/login", "POST", "/api/auth/login/",
                            json={"email": email, "password": PASSWORD})
        if login is None or login.status_code != 200:
            return
        client.headers["Authorization"] = f"Bearer {login.json()['access']}"

        while time.perf_counter() < deadline:
            choice = random.random()
            if choice < 0.25:
                await timed(client, stats, "GET /auth/me", "GET", "/api/auth/me/")
            elif choice < 0.5:
                await timed(client, stats, "GET /conversations", "GET", "/api/conversations/")
            elif choice < 0.7:
                await timed(client, stats, "GET /categories", "GET", "/api/categories/")
            elif choice < 0.85:
                await timed(client, stats, "GET /laws", "GET", f"/api/laws/?page={random.randint(1, 10)}")
            else:
                await timed(client, stats, "GET /articles/{id}", "GET", f"/api/articles/{random.randint(1, 12000)}/")


async def chat_latency(base: str, count: int) -> list[float]:
    """Questions consécutives (comme le critère CR8), avec un compte dédié."""
    async with httpx.AsyncClient(base_url=base, timeout=120) as client:
        email = f"charge-chat-{uuid.uuid4().hex[:8]}@lexia.test"
        await client.post("/api/auth/register/", json={
            "email": email, "first_name": "Charge", "last_name": "Chat", "password": PASSWORD,
        })
        token = (await client.post("/api/auth/login/", json={"email": email, "password": PASSWORD})).json()["access"]
        client.headers["Authorization"] = f"Bearer {token}"

        durations, first_tokens = [], []
        for question in QUESTIONS[:count]:
            # Streaming, comme l'interface : on mesure aussi l'arrivée du premier morceau de texte.
            start = time.perf_counter()
            first = None
            done = False
            async with client.stream("POST", "/api/chat/stream/", json={"message": question}) as response:
                async for line in response.aiter_lines():
                    if line == "event: token" and first is None:
                        first = time.perf_counter() - start
                    elif line == "event: done":
                        done = True
            duration = time.perf_counter() - start
            status = "OK " if done else f"{response.status_code}"
            first_text = f"{first:5.2f} s" if first is not None else "   —   "
            print(f"  {status} premier mot {first_text} · réponse complète {duration:5.2f} s  {question}")
            if done:
                durations.append(duration)
                first_tokens.append(first)
        return durations, first_tokens


def report(stats: Stats, elapsed: float):
    total = sum(len(v) for v in stats.latencies.values())
    errors = sum(stats.errors.values())
    print(f"\n{total} requêtes en {elapsed:.0f} s — {total / elapsed:.1f} requêtes/s — {errors} erreurs\n")
    print(f"{'Endpoint':24} {'requêtes':>9} {'médiane':>9} {'p95':>9} {'max':>9} {'erreurs':>8}")
    for name, values in sorted(stats.latencies.items()):
        print(
            f"{name:24} {len(values):>9} {statistics.median(values) * 1000:>7.0f}ms "
            f"{percentile(values, 0.95) * 1000:>7.0f}ms {max(values) * 1000:>7.0f}ms {stats.errors[name]:>8}"
        )


async def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--users", type=int, default=20, help="Utilisateurs simultanés.")
    parser.add_argument("--duration", type=int, default=30, help="Durée de la charge, en secondes.")
    parser.add_argument("--chat", type=int, default=0, help="Nombre de vraies questions au chatbot (appels au LLM).")
    args = parser.parse_args()

    if args.users:
        print(f"Charge : {args.users} utilisateurs simultanés pendant {args.duration} s sur {args.base_url}")
        stats = Stats()
        start = time.perf_counter()
        deadline = start + args.duration
        await asyncio.gather(*(virtual_user(args.base_url, stats, deadline) for _ in range(args.users)))
        report(stats, time.perf_counter() - start)

    if args.chat:
        print(f"\nChatbot : {args.chat} questions consécutives en streaming (critère CR8 : < 3 s)")
        durations, first_tokens = await chat_latency(args.base_url, args.chat)
        print()
        for label, values in (("Premier mot", first_tokens), ("Réponse complète", durations)):
            if values:
                print(
                    f"{label:17}: médiane {statistics.median(values):.2f} s · max {max(values):.2f} s · "
                    f"{sum(v < 3 for v in values)}/{len(values)} en moins de 3 s"
                )


if __name__ == "__main__":
    asyncio.run(main())
