import os
from typing import List
from sentence_transformers import SentenceTransformer
import pickle
from database import PineconeDatabase
from types_def import SchemaWithFilename
from extract import OUTPUT_FOLDER

model = SentenceTransformer("omarelshehy/Arabic-Retrieval-v1.0")


def load_data(pkl_file):
  with open(pkl_file, "rb") as f:
    data = pickle.load(f)
  return data  # { document_name: embedding_vector }


if __name__ == "__main__":
  DOCUMENT_FOLDER = OUTPUT_FOLDER

  documents = os.listdir(DOCUMENT_FOLDER)
  documents_text = []
  for doc in documents:
    if not doc.endswith(".txt"):
      continue
    doc_path = os.path.join(DOCUMENT_FOLDER, doc)
    with open(doc_path, "r", encoding="utf-8") as f:
      text = f.read()

    documents_text.append(text)
  print(f"Loaded {len(documents_text)} documents")
  embeddings = model.encode(documents_text, show_progress_bar=True, device="cuda")
  print("Embeddings generated")
  data = {doc: emb for doc, emb in zip(documents, embeddings)}

  with open("embeddings.pkl", "wb") as f:
    pickle.dump(data, f)
  print("Embeddings saved to embeddings.pkl")

  # data = load_data("embeddings.pkl")
  vectors: List[SchemaWithFilename] = [
    {
      "id": f"doc-{index}",
      "vector": embedding,
      "metadata": {"filename": doc},
    }
    for index, (doc, embedding) in enumerate(data.items())
  ]
  pcDb = PineconeDatabase("law-documents")
  pcDb.upsert(vectors)
  print("Data upserted to Pinecone")
