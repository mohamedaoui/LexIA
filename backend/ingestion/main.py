import re
from typing import TypedDict
from libretranslate import translate
from extract import split_articles, chunk_text, OUTPUT_FOLDER
from database import PineconeDatabase
from model import Gemini
import os
from types_def import SchemaWithCategory
import pickle

INPUT_FOLDER = OUTPUT_FOLDER


def sanitize(filename: str) -> str:
  return re.sub(r"[^A-Za-z0-9_-]", "_", filename)


class Article(TypedDict):
  number: int
  content: str


if __name__ == "__main__":
  gemini = Gemini()
  db = PineconeDatabase("moroccan-law-db-final")

  if not os.path.exists(INPUT_FOLDER):
    print(f"Input folder '{INPUT_FOLDER}' does not exist.")
    exit(1)

  store = {}
  try:
    for i, filename in enumerate(os.listdir(INPUT_FOLDER)):
      if not filename.endswith(".txt"):
        continue

      input_path = os.path.join(INPUT_FOLDER, filename)
      with open(input_path, "r", encoding="utf-8") as file:
        text = file.read()

      articles = split_articles(text)
      print(f"Processing file {i + 1}: {filename} with {len(articles)} articles.")
      if len(articles) == 0:
        print(f"No articles found in {filename}. Skipping.")
        continue
      translated_articles: list[str] = []

      for idx, article in enumerate(articles, start=1):
        translated_article = translate(article)
        if len(translated_article) > 20 * 1024:  # Limit to 20KB
          print(f"Article {idx} in {filename} exceeds 20KB after translation.")
          translated_article_chunks = chunk_text(
            translated_article, 10 * 1024, 1000, " "
          )
          for chunk_idx, chunk in enumerate(translated_article_chunks, start=1):
            translated_articles.append(f"{chunk} (Chunk {chunk_idx})")
        else:
          translated_articles.append(translated_article)
      print(f"Translated {len(articles)} articles in {filename}...")

      embedded_articles = gemini.embed_content(translated_articles)
      print(f"Embedded {len(embedded_articles)} articles in {filename}...")

      filename_en = translate(filename[:-4])
      filename_en = sanitize(filename_en)
      data: list[SchemaWithCategory] = []
      for idx, (article, embedding) in enumerate(
        zip(translated_articles, embedded_articles), start=1
      ):
        ret = SchemaWithCategory(
          id=f"{filename_en}_{idx}",
          vector=embedding,
          metadata={
            "chunk_text": article,
            "category": filename_en,
          },
        )
        data.append(ret)

      store[filename] = data
      print(f"Upserting {len(data)} articles to the database...")
      db.upsert(data)
      print(f"Processed {filename} with {len(data)} articles.")
  except Exception as e:
    print(f"An error occurred: {e}")
  finally:
    with open("store.pickle", "wb") as f:
      pickle.dump(store, f)
    print("Store saved to 'store.pickle'.")
    print(f"Total files processed: {len(store)}")
    print(f"Total articles processed: {sum(len(v) for v in store.values())}")
