from django.urls import path

from .views import FeedbackExportView, QuestionsExportView, StatsView

urlpatterns = [
    path("stats/", StatsView.as_view(), name="dashboard-stats"),
    path("export/questions.csv", QuestionsExportView.as_view(), name="dashboard-export-questions"),
    path("export/feedback.csv", FeedbackExportView.as_view(), name="dashboard-export-feedback"),
]
