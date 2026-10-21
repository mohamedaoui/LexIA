"""Pipeline RAG : recherche des articles pertinents puis génération de la réponse."""

from dataclasses import dataclass

from django.conf import settings

from legal.models import LegalArticle

from .prompts import CONTEXT_TEMPLATE, DISCLAIMERS, NO_CONTEXT, SYSTEM_PROMPT, detect_language
from .store import get_llm, get_vectorstore


@dataclass
class Source:
    article: LegalArticle
    score: float


@dataclass
class RagAnswer:
    content: str
    language: str
    sources: list[Source]


def retrieve(query: str, k: int | None = None) -> list[Source]:
    """Les `k` articles les plus proches de la question (un article peut avoir plusieurs morceaux)."""
    k = k or settings.RAG_TOP_K
    hits = get_vectorstore().similarity_search_with_relevance_scores(query, k=k * 3)

    best: dict[int, float] = {}
    for doc, score in hits:
        article_id = doc.metadata["article_id"]
        if score >= settings.RAG_MIN_SCORE and score > best.get(article_id, -1):
            best[article_id] = score

    top = sorted(best.items(), key=lambda item: item[1], reverse=True)[:k]
    articles = LegalArticle.objects.select_related("document").in_bulk([a for a, _ in top])
    return [Source(articles[a], round(s, 4)) for a, s in top if a in articles]


def format_context(sources: list[Source]) -> str:
    if not sources:
        return NO_CONTEXT
    return "\n\n".join(
        f"[{s.article.document.title} — Article {s.article.number or s.article.position}]\n"
        f"{s.article.content}"
        for s in sources
    )


@dataclass
class Prepared:
    """Tout ce qu'il faut pour appeler le LLM : messages, sources trouvées, langue."""

    llm: object
    messages: list
    sources: list[Source]
    language: str

    @property
    def disclaimer(self) -> str:
        return f"\n\n---\n{DISCLAIMERS[self.language]}"


def prepare(question: str, history: list[tuple[str, str]] | None = None) -> Prepared:
    """`history` : liste de (rôle, contenu) des messages précédents, du plus ancien au plus récent.

    Lève ImproperlyConfigured avant toute recherche si le LLM n'est pas configuré."""
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

    llm = get_llm()
    history = history or []

    # La question précédente aide à comprendre une relance courte ("et la sanction ?").
    previous_questions = [content for role, content in history if role == "user"][-1:]
    sources = retrieve(" ".join(previous_questions + [question]))

    messages = [SystemMessage(SYSTEM_PROMPT)]
    for role, content in history[-settings.RAG_HISTORY_MESSAGES:]:
        messages.append(HumanMessage(content) if role == "user" else AIMessage(content))
    messages.append(HumanMessage(CONTEXT_TEMPLATE.format(context=format_context(sources), question=question)))

    return Prepared(llm, messages, sources, detect_language(question))


def answer(question: str, history: list[tuple[str, str]] | None = None) -> RagAnswer:
    prepared = prepare(question, history)
    text = prepared.llm.invoke(prepared.messages).text
    return RagAnswer(text.strip() + prepared.disclaimer, prepared.language, prepared.sources)


def stream(prepared: Prepared):
    """Produit la réponse morceau par morceau ; le dernier morceau est l'avertissement légal."""
    for chunk in prepared.llm.stream(prepared.messages):
        if chunk.text:
            yield chunk.text
    yield prepared.disclaimer
