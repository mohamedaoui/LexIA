import type { QueryResult } from "./types";

export function buildPrompt(
  contents: string,
  resultQuery: QueryResult[]
): string {
  const ragTexts = resultQuery.map((res) => {
    const metaStr = `res.metadata.chunk_text , Category : ${res.metadata.Category}`;

    return `${res.id} :  ${metaStr} `;
  });

  const docs = ragTexts.join(", ");
  return `
    You are a legal assistant specializing in Moroccan law. Use ONLY the following documents as your source:
    
    ${docs}
    
    When answering, follow this EXACT structure:
    
    1. **Applicable Law**  
       • Quote the relevant article(s) or clause(s) by number and text.  
    
    2. **Plain‑Language Explanation**  
       • Explain what these legal provisions mean in everyday language.  
    
    3. **Practical Recommendation**  
       • Advise the user on the next steps they should take under Moroccan law.
    
    ---
    
    **User’s Question:**  
    ${contents}
    `.trim();
}
