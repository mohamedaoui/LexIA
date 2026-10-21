export interface Content {
  role: string;
  parts: { text: string }[];
}

export interface Schema {
  id: string;
  vector: number[];
  metadata: {
    chunk_text: string;
  };
}

export interface SchemaWithCategory extends Schema {
  metadata: {
    chunk_text: string;
    category: string;
  };
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: Record<string, string>;
}

export abstract class Database<T extends Schema> {
  abstract upsert(data: T[]): Promise<void>;
  abstract query(queryVector: number[], topK: number): Promise<QueryResult[]>;
}
