from django.db import models


class Category(models.Model):
    slug = models.SlugField(unique=True)
    name_fr = models.CharField(max_length=200)
    name_ar = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "catégorie"
        ordering = ["name_fr"]

    def __str__(self):
        return self.name_fr


class LegalDocument(models.Model):
    """Un texte de loi du corpus (une loi, un code, un dahir...)."""

    title = models.CharField(max_length=500)
    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="documents"
    )
    source_file = models.CharField(max_length=500, unique=True)
    source_url = models.URLField(blank=True)
    language = models.CharField(max_length=10, default="ar")
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "texte de loi"
        verbose_name_plural = "textes de loi"
        ordering = ["title"]

    def __str__(self):
        return self.title


class LegalArticle(models.Model):
    document = models.ForeignKey(LegalDocument, on_delete=models.CASCADE, related_name="articles")
    position = models.PositiveIntegerField(help_text="Ordre de l'article dans le texte.")
    number = models.CharField(max_length=50, blank=True)
    content = models.TextField()
    vector_id = models.CharField(max_length=200, blank=True, help_text="Identifiant dans ChromaDB.")

    class Meta:
        verbose_name = "article"
        ordering = ["document", "position"]
        constraints = [
            models.UniqueConstraint(fields=["document", "position"], name="unique_article_position"),
        ]

    def __str__(self):
        return f"{self.document} — article {self.number or self.position}"


class FAQ(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="faqs")
    question = models.TextField()
    answer = models.TextField()
    language = models.CharField(max_length=10, default="fr")
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name = "FAQ"
        verbose_name_plural = "FAQ"

    def __str__(self):
        return self.question[:80]
