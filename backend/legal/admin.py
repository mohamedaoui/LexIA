from django.contrib import admin

from .models import FAQ, Category, LegalArticle, LegalDocument


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name_fr", "name_ar", "slug"]
    prepopulated_fields = {"slug": ["name_fr"]}
    search_fields = ["name_fr", "name_ar"]


@admin.register(LegalDocument)
class LegalDocumentAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "language", "imported_at"]
    list_filter = ["category", "language"]
    search_fields = ["title", "source_file"]


@admin.register(LegalArticle)
class LegalArticleAdmin(admin.ModelAdmin):
    list_display = ["document", "number", "position"]
    list_select_related = ["document"]
    search_fields = ["content", "document__title"]
    raw_id_fields = ["document"]


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ["question", "category", "language", "is_published"]
    list_filter = ["category", "language", "is_published"]
    search_fields = ["question", "answer"]
