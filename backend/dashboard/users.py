"""Gestion des utilisateurs par les administrateurs (/api/dashboard/users/)."""

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    conversation_count = serializers.IntegerField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "role", "preferred_language",
            "is_active", "is_staff", "is_superuser", "date_joined", "last_login",
            "conversation_count", "question_count",
        ]
        read_only_fields = ["id", "email", "is_superuser", "date_joined", "last_login"]

    def validate(self, attrs):
        request = self.context["request"]
        target = self.instance
        if target == request.user and (attrs.get("is_staff") is False or attrs.get("is_active") is False):
            raise serializers.ValidationError(
                "Vous ne pouvez pas retirer vos propres droits d'administrateur ni désactiver votre compte."
            )
        return attrs


class AdminUserViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                       mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Liste, modification (profil, rôle, compte actif, droits d'administrateur) et suppression.

    Filtres : `q` (email, prénom, nom), `role`, `is_active`, `is_staff`."""

    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = User.objects.annotate(
            conversation_count=Count("conversations", distinct=True),
            question_count=Count(
                "conversations__messages", filter=Q(conversations__messages__role="user"), distinct=True
            ),
        ).order_by("-date_joined")
        params = self.request.query_params
        if q := params.get("q", "").strip():
            qs = qs.filter(Q(email__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q))
        if role := params.get("role"):
            qs = qs.filter(role=role)
        for flag in ("is_active", "is_staff"):
            if (value := params.get(flag)) in ("true", "false"):
                qs = qs.filter(**{flag: value == "true"})
        return qs

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # Un superutilisateur ne peut être modifié ou supprimé que par un autre superutilisateur.
        if request.method not in ("GET", "HEAD", "OPTIONS") and obj.is_superuser and not request.user.is_superuser:
            raise PermissionDenied("Seul un superutilisateur peut modifier un superutilisateur.")

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {"detail": "Vous ne pouvez pas supprimer votre propre compte."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
