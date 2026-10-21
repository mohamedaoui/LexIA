"""Découpage des articles trop longs pour le modèle d'embeddings (512 tokens max)."""

MAX_CHARS = 1200
OVERLAP = 150


def split_for_embedding(text: str, max_chars: int = MAX_CHARS, overlap: int = OVERLAP) -> list[str]:
    """Coupe un texte en morceaux d'au plus `max_chars` caractères, sur des espaces,
    avec un chevauchement de `overlap` caractères pour ne pas perdre le contexte."""
    text = " ".join(text.split())
    if len(text) <= max_chars:
        return [text]

    chunks, start = [], 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        if end < len(text):
            space = text.rfind(" ", start + max_chars // 2, end)
            if space != -1:
                end = space
        chunks.append(text[start:end].strip())
        if end == len(text):
            break
        # Le morceau suivant reprend les `overlap` derniers caractères, à partir d'un début de mot.
        space = text.find(" ", end - overlap, end)
        start = space + 1 if space != -1 else end
    return chunks
