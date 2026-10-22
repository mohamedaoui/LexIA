from rest_framework import serializers

from .models import FAQ, Category, LegalArticle, LegalDocument


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "slug", "name_fr", "name_ar", "description"]


class CategoryWithStatsSerializer(CategorySerializer):
    """Pour la liste des catégories : nombre de lois, de FAQ et de questions rattachées."""

    law_count = serializers.SerializerMethodField()
    faq_count = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta(CategorySerializer.Meta):
        fields = CategorySerializer.Meta.fields + ["law_count", "faq_count", "question_count"]

    def get_law_count(self, obj) -> int:
        return getattr(obj, "law_count", 0)

    def get_faq_count(self, obj) -> int:
        return getattr(obj, "faq_count", 0)

    def get_question_count(self, obj) -> int:
        return getattr(obj, "question_count", 0)


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
    language = serializers.ChoiceField(choices=[("fr", "Français"), ("ar", "العربية")], default="fr")
    category_name_fr = serializers.CharField(source="category.name_fr", read_only=True)
    category_name_ar = serializers.CharField(source="category.name_ar", read_only=True)

    class Meta:
        model = FAQ
        fields = [
            "id", "category", "category_name_fr", "category_name_ar",
            "question", "answer", "language", "is_published",
        ]
