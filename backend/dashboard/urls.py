from django.urls import path
from rest_framework.routers import SimpleRouter

from .users import AdminUserViewSet
from .views import FeedbackExportView, QuestionsExportView, StatsView

router = SimpleRouter()
router.register("users", AdminUserViewSet, basename="admin-user")

urlpatterns = [
    path("stats/", StatsView.as_view(), name="dashboard-stats"),
    path("export/questions.csv", QuestionsExportView.as_view(), name="dashboard-export-questions"),
    path("export/feedback.csv", FeedbackExportView.as_view(), name="dashboard-export-feedback"),
    *router.urls,
]
