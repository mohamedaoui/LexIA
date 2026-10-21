from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, FAQViewSet, LegalArticleViewSet, LegalDocumentViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("faqs", FAQViewSet, basename="faq")
router.register("laws", LegalDocumentViewSet, basename="law")
router.register("articles", LegalArticleViewSet, basename="article")

urlpatterns = router.urls
