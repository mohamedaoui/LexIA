import json
from types import SimpleNamespace

import pytest
from django.core.exceptions import ImproperlyConfigured
from langchain_core.documents import Document
from langchain_core.messages import AIMessage, AIMessageChunk

from chat.models import Conversation, Message, MessageSource
from conftest import ConversationFactory
from legal.models import Category, LegalArticle, LegalDocument
from rag import pipeline
from rag.chunking import split_for_embedding
from rag.prompts import DISCLAIMERS, detect_language


class FakeStore:
    def __init__(self, hits):
        self.hits = hits
        self.queries = []

    def similarity_search_with_relevance_scores(self, query, k):
        self.queries.append(query)
        return self.hits[:k]


class FakeLLM:
    def __init__(self, reply="**Loi applicable** : [Code — Article 1]"):
        self.reply = reply
        self.calls = []

    def invoke(self, messages):
        self.calls.append(messages)
        return AIMessage(self.reply)

    def stream(self, messages):
        self.calls.append(messages)
        for word in self.reply.split(" "):
            yield AIMessageChunk(word + " ")


class BrokenLLM(FakeLLM):
    def stream(self, messages):
        yield AIMessageChunk("Début ")
        raise RuntimeError("quota dépassé")


@pytest.fixture
def articles(db):
    travail = Category.objects.create(slug="travail", name_fr="Travail", name_ar="الشغل")
    document = LegalDocument.objects.create(title="مدونة الشغل", source_file="travail.txt", category=travail)
    return [
        LegalArticle.objects.create(document=document, position=i, number=str(i), content=f"نص المادة {i}")
        for i in (1, 2, 3)
    ]


@pytest.fixture
def fake_rag(monkeypatch, articles):
    store = FakeStore([
        (Document("a", metadata={"article_id": articles[1].id}), 0.91),
        (Document("b", metadata={"article_id": articles[1].id}), 0.80),  # 2e morceau du même article
        (Document("c", metadata={"article_id": articles[0].id}), 0.75),
    ])
    llm = FakeLLM()
    monkeypatch.setattr(pipeline, "get_vectorstore", lambda: store)
    monkeypatch.setattr(pipeline, "get_llm", lambda: llm)
    return SimpleNamespace(store=store, llm=llm, articles=articles)


# --- Découpage et langue -------------------------------------------------------

def test_short_text_is_one_chunk():
    assert split_for_embedding("  نص   قصير ") == ["نص قصير"]


def test_long_text_is_split_with_overlap():
    words = [f"mot{i}" for i in range(600)]
    chunks = split_for_embedding(" ".join(words), max_chars=500, overlap=100)
    assert len(chunks) > 1
    assert all(len(c) <= 500 for c in chunks)
    assert chunks[0].split()[-1] in chunks[1]  # chevauchement
    assert set(" ".join(chunks).split()) == set(words)  # rien de perdu


@pytest.mark.parametrize("text, expected", [
    ("Mon employeur ne me paie pas", "fr"),
    ("مشغلي لم يدفع لي الأجر", "ar"),
    ("واش عندي الحق نطالب بالتعويض؟", "ar"),
    ("123 ?", "fr"),
])
def test_detect_language(text, expected):
    assert detect_language(text) == expected


# --- Pipeline ------------------------------------------------------------------

def test_retrieve_keeps_best_score_per_article(fake_rag, settings):
    settings.RAG_MIN_SCORE = 0.0
    sources = pipeline.retrieve("question", k=6)
    assert [s.article.number for s in sources] == ["2", "1"]
    assert sources[0].score == 0.91


def test_retrieve_drops_low_scores(fake_rag, settings):
    settings.RAG_MIN_SCORE = 0.8
    assert [s.article.number for s in pipeline.retrieve("question", k=6)] == ["2"]


def test_answer_adds_disclaimer_and_context(fake_rag):
    result = pipeline.answer("Quel est le délai de préavis ?")
    assert result.content.endswith(DISCLAIMERS["fr"])
    assert result.language == "fr"
    prompt = fake_rag.llm.calls[0][-1].content
    assert "[مدونة الشغل — Article 2]" in prompt
    assert "Quel est le délai de préavis ?" in prompt


def test_answer_in_arabic_gets_arabic_disclaimer(fake_rag):
    assert pipeline.answer("ما هي مدة الإشعار؟").content.endswith(DISCLAIMERS["ar"])


def test_follow_up_uses_previous_question_for_search(fake_rag):
    history = [("user", "Licenciement abusif"), ("assistant", "Pouvez-vous préciser ?")]
    pipeline.answer("Et l'indemnité ?", history)
    assert fake_rag.store.queries[-1] == "Licenciement abusif Et l'indemnité ?"
    assert len(fake_rag.llm.calls[0]) == 4  # système + 2 messages d'historique + question


# --- Endpoint /api/chat/ -------------------------------------------------------

def test_chat_creates_conversation_with_sources(auth_api, user, fake_rag):
    response = auth_api.post("/api/chat/", {"message": "Mon employeur ne me paie pas"})
    assert response.status_code == 201

    conversation = Conversation.objects.get(id=response.data["conversation_id"])
    assert conversation.user == user
    assert conversation.title == "Mon employeur ne me paie pas"
    assert [m.role for m in conversation.messages.all()] == ["user", "assistant"]
    assert response.data["answer"]["sources"][0]["number"] == "2"
    assert MessageSource.objects.count() == 2


def test_chat_continues_existing_conversation(auth_api, user, fake_rag):
    conversation = ConversationFactory(user=user)
    conversation.messages.create(role=Message.Role.USER, content="Licenciement")
    response = auth_api.post("/api/chat/", {"message": "Et ensuite ?", "conversation_id": str(conversation.id)})
    assert response.status_code == 201
    assert conversation.messages.count() == 3


def test_chat_refuses_other_users_conversation(auth_api, fake_rag):
    other = ConversationFactory()
    response = auth_api.post("/api/chat/", {"message": "Bonjour", "conversation_id": str(other.id)})
    assert response.status_code == 404
    assert not fake_rag.llm.calls


def test_chat_requires_authentication(api):
    assert api.post("/api/chat/", {"message": "Bonjour"}).status_code == 401


def test_chat_without_api_key_returns_503_and_saves_nothing(auth_api, monkeypatch):
    def not_configured(*args):
        raise ImproperlyConfigured("GEMINI_API_KEY n'est pas défini")

    monkeypatch.setattr(pipeline, "answer", not_configured)
    response = auth_api.post("/api/chat/", {"message": "Bonjour"})
    assert response.status_code == 503
    assert not Conversation.objects.exists()


# --- Endpoint /api/chat/stream/ ------------------------------------------------

def read_events(response):
    body = b"".join(response.streaming_content).decode("utf-8")
    events = []
    for block in body.strip().split("\n\n"):
        event, data = block.split("\n")
        events.append((event.removeprefix("event: "), json.loads(data.removeprefix("data: "))))
    return events


def test_stream_sends_sources_tokens_then_done(auth_api, user, fake_rag):
    response = auth_api.post("/api/chat/stream/", {"message": "ما هي مدة الإشعار؟"})
    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/event-stream")

    events = read_events(response)
    names = [name for name, _ in events]
    assert names[:2] == ["sources", "category"] and names[-1] == "done"
    assert set(names[2:-1]) == {"token"}
    assert events[0][1][0]["number"] == "2"
    assert events[1][1]["slug"] == "travail"

    streamed = "".join(data for name, data in events if name == "token")
    done = events[-1][1]
    assert done["answer"]["content"] == streamed.strip()
    assert done["answer"]["content"].endswith(DISCLAIMERS["ar"])
    assert Conversation.objects.get(id=done["conversation_id"]).messages.count() == 2


def test_stream_error_saves_nothing(auth_api, monkeypatch, fake_rag):
    monkeypatch.setattr(pipeline, "get_llm", lambda: BrokenLLM())
    events = read_events(auth_api.post("/api/chat/stream/", {"message": "Bonjour"}))
    assert [name for name, _ in events] == ["sources", "category", "token", "error"]
    assert not Conversation.objects.exists()


@pytest.mark.parametrize("debug", [True, False])
def test_stream_without_api_key_returns_503(auth_api, settings, debug):
    settings.GEMINI_API_KEY = ""
    settings.DEBUG = debug
    pipeline.get_llm.cache_clear()
    response = auth_api.post("/api/chat/stream/", {"message": "Bonjour"})
    assert response.status_code == 503
    # Le détail de configuration n'est montré qu'en développement.
    assert ("GEMINI_API_KEY" in response.data["detail"]) is debug


class QuotaLLM(FakeLLM):
    def stream(self, messages):
        raise RuntimeError("429 RESOURCE_EXHAUSTED: quota exceeded")
        yield  # générateur


def test_stream_quota_error_has_clear_message(auth_api, monkeypatch, fake_rag):
    monkeypatch.setattr(pipeline, "get_llm", lambda: QuotaLLM())
    events = read_events(auth_api.post("/api/chat/stream/", {"message": "Bonjour"}))
    assert events[-1] == ("error", {"detail": "La limite d'utilisation gratuite de l'IA est atteinte. Réessayez plus tard."})


def test_llm_has_fallback_models(settings):
    from rag.store import get_llm

    settings.GEMINI_API_KEY = "test"
    settings.GEMINI_MODEL = "principal"
    settings.GEMINI_FALLBACK_MODELS = ["secours-1", "secours-2"]
    get_llm.cache_clear()
    try:
        llm = get_llm()
        assert llm.runnable.model.endswith("principal")
        assert [f.model.split("/")[-1] for f in llm.fallbacks] == ["secours-1", "secours-2"]
    finally:
        get_llm.cache_clear()


# --- Catégorie de la question ----------------------------------------------------

def make_source(category, score):
    document = LegalDocument.objects.create(
        title=f"loi {LegalDocument.objects.count()}", source_file=f"{LegalDocument.objects.count()}.txt", category=category
    )
    article = LegalArticle.objects.create(document=document, position=1, number="1", content="نص")
    return pipeline.Source(article, score)


@pytest.mark.django_db
def test_detect_category_weights_by_score():
    famille = Category.objects.create(slug="famille", name_fr="Famille")
    penal = Category.objects.create(slug="penal", name_fr="Pénal")
    sources = [make_source(penal, 0.9), make_source(famille, 0.6), make_source(famille, 0.6)]
    assert pipeline.detect_category(sources) == famille  # 1.2 contre 0.9


@pytest.mark.django_db
def test_detect_category_none_when_too_scattered():
    sources = [make_source(Category.objects.create(slug=f"c{i}", name_fr=f"C{i}"), 0.8) for i in range(4)]
    assert pipeline.detect_category(sources) is None  # 25 % chacune < 40 %


@pytest.mark.django_db
def test_detect_category_without_sources_or_categories():
    assert pipeline.detect_category([]) is None
    assert pipeline.detect_category([make_source(None, 0.9)]) is None


def test_chat_saves_category_on_both_messages(auth_api, fake_rag):
    response = auth_api.post("/api/chat/", {"message": "Mon employeur ne me paie pas"})
    assert response.data["answer"]["category"]["slug"] == "travail"
    assert response.data["question"]["category"]["name_ar"] == "الشغل"
    conversation = Conversation.objects.get(id=response.data["conversation_id"])
    assert {m.category.slug for m in conversation.messages.all()} == {"travail"}

    detail = auth_api.get(f"/api/conversations/{conversation.id}/")
    assert detail.data["messages"][1]["category"]["slug"] == "travail"


@pytest.mark.django_db
def test_load_categories_from_json(tmp_path):
    from legal.categories import load_categories

    LegalDocument.objects.create(title="مدونة الشغل", source_file="مدونة الشغل.txt")
    LegalDocument.objects.create(title="hors liste", source_file="autre.txt")
    path = tmp_path / "categories.json"
    path.write_text(json.dumps({
        "categories": [{"slug": "travail", "name_fr": "Travail", "name_ar": "الشغل"}],
        "laws": {"travail": ["مدونة الشغل.txt", "pas encore importé.txt"]},
    }, ensure_ascii=False), encoding="utf-8")

    assert load_categories(path) == (1, 1)
    assert load_categories(path) == (1, 1)  # relançable sans doublon
    assert LegalDocument.objects.get(source_file="مدونة الشغل.txt").category.slug == "travail"
    assert LegalDocument.objects.get(source_file="autre.txt").category is None


@pytest.mark.django_db
def test_classify_messages_backfills_old_exchanges(user):
    from django.core.management import call_command

    travail = Category.objects.create(slug="travail", name_fr="Travail")
    conversation = ConversationFactory(user=user)
    question = conversation.messages.create(role=Message.Role.USER, content="Salaire impayé")
    answer = conversation.messages.create(role=Message.Role.ASSISTANT, content="Selon...")
    MessageSource.objects.create(message=answer, article=make_source(travail, 0.9).article, score=0.9)
    unrelated = conversation.messages.create(role=Message.Role.ASSISTANT, content="Bonjour")  # sans source

    call_command("classify_messages")

    question.refresh_from_db(); answer.refresh_from_db(); unrelated.refresh_from_db()
    assert question.category == travail and answer.category == travail
    assert unrelated.category is None


@pytest.mark.django_db
def test_huge_article_sends_only_the_matched_passage():
    document = LegalDocument.objects.create(title="مجموعة القانون الجنائي", source_file="penal.txt")
    huge = LegalArticle.objects.create(document=document, position=1, number="1", content="نص " * 100_000)
    small = LegalArticle.objects.create(document=document, position=2, number="2", content="المادة 2 قصيرة")

    context = pipeline.format_context([
        pipeline.Source(huge, 0.9, excerpt="الفقرة التي وجدها البحث"),
        pipeline.Source(small, 0.8, excerpt="قصيرة"),
    ])
    assert "الفقرة التي وجدها البحث" in context
    assert "المادة 2 قصيرة" in context  # un article court est envoyé en entier
    assert len(context) < 1_000


def test_retrieve_keeps_matched_excerpt(fake_rag, settings):
    settings.RAG_MIN_SCORE = 0.0
    assert pipeline.retrieve("question")[0].excerpt == "a"
