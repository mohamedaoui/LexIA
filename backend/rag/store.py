"""Accès au modèle d'embeddings, à la base vectorielle ChromaDB et au LLM.

Chaque objet est créé une seule fois par processus (chargement du modèle coûteux).
"""

from functools import lru_cache

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

COLLECTION_NAME = "legal_articles"


@lru_cache(maxsize=1)
def get_embeddings():
    from langchain_huggingface import HuggingFaceEmbeddings

    # Les modèles e5 attendent les préfixes "query: " et "passage: ".
    return HuggingFaceEmbeddings(
        model_name=settings.RAG_EMBEDDING_MODEL,
        encode_kwargs={"prompt": "passage: ", "normalize_embeddings": True},
        query_encode_kwargs={"prompt": "query: ", "normalize_embeddings": True},
    )


@lru_cache(maxsize=1)
def get_vectorstore():
    from langchain_chroma import Chroma

    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=get_embeddings(),
        persist_directory=str(settings.CHROMA_DIR),
        collection_metadata={"hnsw:space": "cosine"},
    )


@lru_cache(maxsize=1)
def get_llm():
    if not settings.GEMINI_API_KEY:
        raise ImproperlyConfigured("GEMINI_API_KEY n'est pas défini dans backend/.env.")
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.2,
        # Réflexion courte : réponse ~6 s au lieu de ~45 s, qualité équivalente sur nos tests.
        thinking_level=settings.GEMINI_THINKING_LEVEL,
    )
