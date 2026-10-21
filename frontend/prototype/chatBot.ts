import { PineconeDatabase } from "./database";
import { Gemini } from "./model";
import { buildPrompt } from "./promptBuilder";

const gemini = new Gemini();

const database = new PineconeDatabase("moroccan-law-db");

const userQuery = "مرحبًا، قام شرطي بصفعي على وجهي، لم أفعل أي شيء خاطئ ومع ذلك صفعني ";

const embInp = await gemini.embedContent([userQuery]);

const topDocs = await database.query(embInp[0]!, 3);

console.log(topDocs);

const prompt = buildPrompt(userQuery, topDocs);

const response = gemini.prompt(prompt);
for await (const chunk of response) {
  console.log(chunk);
}
