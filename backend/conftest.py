import factory
import pytest
from rest_framework.test import APIClient

from accounts.models import User
from chat.models import Conversation, Message


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@lexia.ma")
    first_name = "Test"
    last_name = "User"
    password = factory.django.Password("Motdepasse-solide-42")


class ConversationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Conversation

    user = factory.SubFactory(UserFactory)
    title = "Question sur le contrat de travail"


class MessageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Message

    conversation = factory.SubFactory(ConversationFactory)
    role = Message.Role.ASSISTANT
    content = "Selon l'article 6 du Code du travail..."


@pytest.fixture(autouse=True)
def reset_throttles():
    """Les compteurs de limites de requêtes vivent dans le cache : on repart de zéro à chaque test."""
    from django.core.cache import cache

    cache.clear()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def auth_api(api, user):
    api.force_authenticate(user)
    return api
