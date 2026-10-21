import os
from extract import split_articles, OUTPUT_FOLDER


def test_split_articles_all_files():
  txt_files = [f for f in os.listdir(OUTPUT_FOLDER) if f.endswith(".txt")]

  no_detect = 0

  for filename in txt_files:
    file_path = os.path.join(OUTPUT_FOLDER, filename)

    with open(file_path, "r", encoding="utf-8") as f:
      text = f.read()

    print(f"\nTesting file: {filename}")
    articles = split_articles(text)
    if len(articles) <= 1:
      no_detect += 1

    print(f"Number of articles found: {len(articles)}")

  print(f"Failure: {no_detect / len(txt_files) * 100:.2f}%")


def test_split_articles_sample_text():
  sample_text = """
    المادة األولى
    هذا نص المادة الأولى من القانون.
    
    المادة2
    هذا نص المادة الثانية من القانون.
    
    المادة 3
    هذا نص المادة الثالثة من القانون.

    الفصل 4
    هذا نص الفصل الرابع من القانون.

    المادة 5
    هذا نص المادة الخامسة من القانون.
    """

  articles = split_articles(sample_text)

  assert len(articles) == 5, "Should find 5 articles"
  assert "المادة األولى" in articles[0], "First article should contain 'المادة األولى'"
  assert "المادة 2" in articles[1], "Second article should contain 'المادة 2'"
  assert "المادة 4" in articles[3], "Fourth article should contain 'الفصل 4'"


if __name__ == "__main__":
  test_split_articles_all_files()
  test_split_articles_sample_text()
  print("All tests completed!")
