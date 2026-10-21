import {
  type Index,
  type RecordMetadata,
  Pinecone,
} from "@pinecone-database/pinecone";
import { Database, type QueryResult, type SchemaWithCategory } from "./types";

// await pc.createIndex({
//   name: "quickstart",
//   dimension: 768,
//   metric: "cosine",
//   spec: {
//     serverless: {
//       cloud: "aws",
//       region: "us-east-1",
//     },
//   },
// });
// process.exit(0);

export class PineconeDatabase extends Database<SchemaWithCategory> {
  private pc: Pinecone;
  private index: Index<RecordMetadata>;

  constructor(indexName: string) {
    super();
    const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
    if (!PINECONE_API_KEY) {
      console.error("PINECONE_API_KEY is not set");
      process.exit(1);
    }
    this.pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    this.index = this.pc.Index(indexName);
  }

  async upsert(data: SchemaWithCategory[]): Promise<void> {
    await this.index.upsert(
      data.map((item) => ({
        id: item.id,
        values: item.vector,
        metadata: item.metadata,
      })),
    );
  }

  async query(queryVector: number[], topK = 10): Promise<QueryResult[]> {
    const results = await this.index.searchRecords({
      query: {
        topK,
        vector: {
          values: queryVector,
        },
      },
      fields: ["chunk_text", "category"],
    });

    return results.result.hits.map((hit) => ({
      id: hit._id,
      score: +hit._score.toFixed(4),
      metadata: {
        chunk_text: (hit.fields as SchemaWithCategory["metadata"]).chunk_text,
        category: (hit.fields as SchemaWithCategory["metadata"]).category,
      },
    }));
  }

  async createIndex(name: string, dimension = 768): Promise<void> {
    const index = await this.pc.createIndex({
      name,
      dimension,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });
    console.log("Index created:", index);
  }
}
