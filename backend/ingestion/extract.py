import os
import re
from typing import List
import subprocess

CHUCK_SIZE = 3000
CHUNK_OVERLAP = 100
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data")
FOLDER_PATH = os.path.join(DATA_DIR, "PDFs")
OUTPUT_FOLDER = os.path.join(DATA_DIR, "PDF_text")


def clean_text(text: str) -> str:
  cleaned_text = re.sub(r"[^\w\u0600-\u06FF\s\.\,\!\?\:\;\'\"\(\)\[\]\-]+", "", text)
  # cleaned_text = re.sub(r"\s+", " ", cleaned_text)
  return cleaned_text


def split_articles(text: str) -> List[str]:
  captures = re.split(r"(?:(?:المادة|الفصل|املادة)\s?(\d+|األولى))\n", text)[1:]
  if not captures or len(captures) < 2:
    return []
  articles: list[str] = []
  buffer: str = ""
  article_idx = 1 if captures[0].strip() == "األولى" else int(captures[0].strip())

  for i, capture in enumerate(captures):
    if i % 2 == 0:
      if capture.strip() == "األولى" or int(capture) == article_idx:
        if buffer:
          articles.append(buffer.strip())
          buffer = ""
        article_idx += 1

      buffer += f"المادة {capture} "
    else:
      buffer += capture

  if buffer:
    articles.append(buffer)
  return articles


def chunk_text(
  text: str, chunk_size: int, overlap: int, split_by: str = "\n\n"
) -> List[str]:
  chunks = []
  paragraphs = text.split(split_by)

  current_chunk = ""
  for paragraph in paragraphs:
    if len(current_chunk) + len(paragraph) > chunk_size:
      chunks.append(current_chunk.strip())
      current_chunk = current_chunk[-overlap:]

    current_chunk += paragraph + split_by

  if len(current_chunk) > 0:
    print(f"Current chunk length: {len(current_chunk)}")
    chunks.append(current_chunk.strip())

  return chunks


if __name__ == "__main__":
  if not os.path.exists(OUTPUT_FOLDER):
    os.makedirs(OUTPUT_FOLDER)
  for filename in os.listdir(FOLDER_PATH):
    if not filename.endswith(".pdf"):
      continue
    file_path = os.path.join(FOLDER_PATH, filename)
    command = f"pdftotext -layout '{file_path}' '{os.path.join(OUTPUT_FOLDER, filename[:-4] + '.txt')}'"
    try:
      subprocess.run(command, shell=True, check=True)
      print(f"Converted {filename} to text.")
    except subprocess.CalledProcessError as e:
      print(f"Error converting {filename}: {e}")
      exit(1)

  for filename in os.listdir(OUTPUT_FOLDER):
    if not filename.endswith(".txt"):
      continue
    file_path = os.path.join(OUTPUT_FOLDER, filename)
    with open(file_path, "r+", encoding="utf-8") as f:
      text = f.read()
      cleaned_text = clean_text(text)
      f.seek(0)
      f.write(cleaned_text)
      f.truncate()
    print(f"Cleaned text saved to {file_path}")
