from rest_framework import serializers

from .models import FAQ, Category, LegalArticle, LegalDocument


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "slug", "name_fr", "name_ar", "description"]


class LegalDocumentSerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = LegalDocument
        fields = ["id", "title", "category", "source_url", "language", "article_count"]


class LegalArticleSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source="document.title", read_only=True)

    class Meta:
        model = LegalArticle
        fields = ["id", "document", "document_title", "position", "number", "content"]


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ["id", "category", "question", "answer", "language"]
