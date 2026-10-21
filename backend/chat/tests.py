import pytest

from chat.models import Conversation, Feedback, Message
from conftest import ConversationFactory, MessageFactory

pytestmark = pytest.mark.django_db


def test_create_and_list_own_conversations(auth_api, user):
    response = auth_api.post("/api/conversations/", {"title": "Licenciement"})
    assert response.status_code == 201
    assert Conversation.objects.get(id=response.data["id"]).user == user

    ConversationFactory()  # conversation d'un autre utilisateur
    response = auth_api.get("/api/conversations/")
    assert [c["title"] for c in response.data["results"]] == ["Licenciement"]


def test_cannot_read_other_users_conversation(auth_api):
    other = ConversationFactory()
    assert auth_api.get(f"/api/conversations/{other.id}/").status_code == 404
    assert auth_api.delete(f"/api/conversations/{other.id}/").status_code == 404


def test_conversation_detail_includes_messages(auth_api, user):
    message = MessageFactory(conversation__user=user)
    response = auth_api.get(f"/api/conversations/{message.conversation_id}/")
    assert response.status_code == 200
    assert response.data["messages"][0]["content"] == message.content


def test_feedback_on_assistant_message(auth_api, user):
    message = MessageFactory(conversation__user=user)
    url = f"/api/messages/{message.id}/feedback/"

    assert auth_api.post(url, {"rating": 1}).status_code == 201
    assert auth_api.post(url, {"rating": -1, "comment": "Incomplet"}).status_code == 200
    assert Feedback.objects.get(message=message).rating == -1


def test_feedback_rejected_on_user_message_or_other_user(auth_api, user):
    own_question = MessageFactory(conversation__user=user, role=Message.Role.USER)
    others_answer = MessageFactory()
    assert auth_api.post(f"/api/messages/{own_question.id}/feedback/", {"rating": 1}).status_code == 404
    assert auth_api.post(f"/api/messages/{others_answer.id}/feedback/", {"rating": 1}).status_code == 404
    assert not Feedback.objects.exists()
