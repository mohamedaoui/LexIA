from django.contrib import admin

from .models import Conversation, Feedback, Message, MessageSource


class MessageInline(admin.TabularInline):
    model = Message
    fields = ["role", "content", "category", "created_at"]
    readonly_fields = ["created_at"]
    extra = 0


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "language", "created_at", "updated_at"]
    list_filter = ["language"]
    search_fields = ["title", "user__email"]
    inlines = [MessageInline]


class MessageSourceInline(admin.TabularInline):
    model = MessageSource
    raw_id_fields = ["article"]
    extra = 0


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["conversation", "role", "category", "created_at"]
    list_filter = ["role", "category"]
    search_fields = ["content"]
    inlines = [MessageSourceInline]


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ["message", "user", "rating", "created_at"]
    list_filter = ["rating"]
