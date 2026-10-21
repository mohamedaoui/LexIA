from django.db.models import Count
from rest_framework import permissions, viewsets

from .models import FAQ, Category, LegalArticle, LegalDocument
from .serializers import (
    CategorySerializer,
    FAQSerializer,
    LegalArticleSerializer,
    LegalDocumentSerializer,
)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Lecture publique (même sans compte), écriture réservée aux administrateurs (critère CR6)."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class FAQViewSet(viewsets.ModelViewSet):
    serializer_class = FAQSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = FAQ.objects.all()
        if not self.request.user.is_staff:
            qs = qs.filter(is_published=True)
        for field in ("category", "language"):
            if value := self.request.query_params.get(field):
                qs = qs.filter(**{field: value})
        return qs


class LegalDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LegalDocument.objects.annotate(article_count=Count("articles"))
    serializer_class = LegalDocumentSerializer


class LegalArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LegalArticle.objects.select_related("document")
    serializer_class = LegalArticleSerializer
