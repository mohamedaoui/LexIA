import os
import sys
from pinecone import Pinecone, ServerlessSpec, Vector

# from pinecone.data.types import SearchQueryTypedDict
from typing import List

from types_def import Database, QueryResult, SchemaWithCategory


class PineconeDatabase(Database):
  def __init__(self, index_name: str):
    PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
    if not PINECONE_API_KEY:
      print("PINECONE_API_KEY is not set", file=sys.stderr)
      sys.exit(1)
    self.pc = Pinecone(api_key=PINECONE_API_KEY)
    self.index = self.pc.Index(index_name)

  def upsert(self, data: List[SchemaWithCategory]) -> None:
    vectors = [
      Vector(
        id=item["id"],
        values=item["vector"]
        if isinstance(item["vector"], list)
        else item["vector"].tolist(),
        metadata={
          "chunk_text": item["metadata"]["chunk_text"],
          "category": item["metadata"]["category"],
        },
      )
      for item in data
    ]

    self.index.upsert(vectors=vectors)

  def delete(self, ids: List[str]) -> None:
    self.index.delete(ids=ids)

  def delete_by_filter(self, filter_dict: dict) -> None:
    self.index.delete(filter=filter_dict)

  def query(self, query_vector: List[float], top_k: int = 10) -> List[QueryResult]:
    query = {
      "top_k": top_k,
      "vector": {
        "values": query_vector,
      },  # type: ignore
    }

    results = self.index.search(
      namespace="",
      query=query,  # type: ignore
      fields=["chunk_text", "category"],
    )

    return [
      {
        "id": hit["_id"],
        "score": round(hit["_score"], 4),
        "metadata": {
          "chunk_text": hit["fields"]["chunk_text"],
          "category": hit["fields"]["category"],
        },
      }
      for hit in results["result"]["hits"]
    ]

  def create_index(self, name: str, dimension: int = 768) -> None:
    index = self.pc.create_index(
      name=name,
      dimension=dimension,
      metric="cosine",
      spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1",
      ),
    )
    print(f"Index created: {index}")
