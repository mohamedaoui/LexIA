"""Découpage des textes de loi en articles.

Repris de ingestion/extract.py. Le texte vient de `pdftotext`, qui écrit souvent
"الأولى" sous la forme "األولى" (lettres inversées) : on accepte les deux.
"""

import re

FIRST = ("األولى", "الأولى")
ARTICLE_RE = re.compile(r"(?:(?:المادة|الفصل|املادة)\s?(\d+|األولى|الأولى))\n")


def split_articles(text: str) -> list[tuple[str, str]]:
    """Retourne une liste de (numéro, contenu). Liste vide si aucun article détecté."""
    captures = ARTICLE_RE.split(text)[1:]
    if len(captures) < 2:
        return []

    articles: list[tuple[str, str]] = []
    number, buffer = None, ""
    expected = 1 if captures[0].strip() in FIRST else int(captures[0].strip())

    for i, capture in enumerate(captures):
        if i % 2 == 0:
            label = capture.strip()
            # Un nouvel article commence quand le numéro est celui attendu ;
            # sinon c'est un renvoi ("voir l'article 12") et on reste dans l'article courant.
            if label in FIRST or int(label) == expected:
                if buffer.strip():
                    articles.append((number, buffer.strip()))
                number, buffer = ("1" if label in FIRST else label), ""
                expected += 1
            buffer += f"المادة {label} "
        else:
            buffer += capture

    if buffer.strip():
        articles.append((number, buffer.strip()))
    return articles
