from abc import ABC, abstractmethod
from typing import Dict, List, TypedDict, Any


class Content(TypedDict):
  role: str
  parts: List[Dict[str, str]]


class Schema(TypedDict):
  id: str
  vector: List[float]
  # metadata: Dict[str, str]


class Metadata(TypedDict):
  chunk_text: str
  category: str


class SchemaWithCategory(Schema):
  metadata: Metadata


class FilenameMetadata(TypedDict):
  filename: str


class SchemaWithFilename(Schema):
  metadata: FilenameMetadata


class QueryResult(TypedDict):
  id: str
  score: float
  metadata: Dict[str, str]


class Database(ABC):
  @abstractmethod
  def upsert(self, data: List[Any]) -> None:
    pass

  @abstractmethod
  def query(self, query_vector: List[float], top_k: int) -> List[QueryResult]:
    pass
