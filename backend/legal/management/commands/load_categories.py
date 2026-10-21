from django.core.management.base import BaseCommand

from legal.categories import CATEGORIES_FILE, load_categories


class Command(BaseCommand):
    help = "Charge les catégories juridiques et le classement des lois depuis data/categories.json."

    def add_arguments(self, parser):
        parser.add_argument("--file", default=str(CATEGORIES_FILE))

    def handle(self, file, **options):
        categories, classified = load_categories(file)
        self.stdout.write(self.style.SUCCESS(f"{categories} catégories, {classified} textes de loi classés."))
