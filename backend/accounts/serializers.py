from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "preferred_language", "is_staff", "is_superuser"]
        read_only_fields = ["id", "email", "is_staff", "is_superuser"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "password", "role", "preferred_language"]
        read_only_fields = ["id"]
        extra_kwargs = {"first_name": {"required": True}, "last_name": {"required": True}}

    def validate(self, attrs):
        validate_password(attrs["password"], user=User(**{k: v for k, v in attrs.items() if k != "password"}))
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
