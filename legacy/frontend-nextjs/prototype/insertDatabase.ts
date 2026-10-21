import { PineconeDatabase } from "./database";
import { Gemini } from "./model";

import { type SchemaWithCategory } from "./types";

const gemini = new Gemini();

export const lawsList: { id: string; textLaw: string; category: string }[] = [
  {
    id: "P225",
    textLaw: `Article 225 of the Moroccan Penal Code: “Tout magistrat, tout fonctionnaire public ou tout agent de l’autorité ou des forces de l’ordre qui ordonne ou commet un acte arbitraire portant atteinte à la liberté individuelle ou aux droits de la personne est puni d’un emprisonnement de six mois à cinq ans et d’une amende de 200 à 500 dirhams.”`,
    category: "arbitrary_act",
  },

  {
    id: "P230",
    textLaw: `Article 230 of the Moroccan Penal Code: “Tout magistrat, tout fonctionnaire public ou tout agent ou préposé de l’autorité ou des forces publiques qui, en cette qualité, pénètre dans le domicile privé d’une personne contre sa volonté, en dehors des cas prévus par la loi, est puni d’un emprisonnement d’un mois à un an et d’une amende de 200 à 500 dirhams.”`,
    category: "privacy_violation",
  },

  {
    id: "P231",
    textLaw: `Article 231 of the Moroccan Penal Code: “Tout magistrat, tout fonctionnaire public ou tout agent ou préposé de l’autorité ou des forces de l’ordre qui, sans motif légitime, use de violence contre des personnes dans l’exercice ou à l’occasion de l’exercice de ses fonctions est puni conformément aux articles 401–403, avec peine doublée s’il s’agit d’une infraction de nature correctionnelle.”`,
    category: "assault_by_officer",
  },
  {
    id: "P231-1",
    textLaw: `Article 231‑1 of the Moroccan Penal Code: “Est puni d’une peine de cinq à quinze ans de réclusion criminelle et d’une amende de 10 000 à 30 000 dirhams tout fonctionnaire public qui commet un acte de torture tel que défini à l’article 1er de la Convention contre la torture.”`,
    category: "torture",
  },
  {
    id: "P400",
    textLaw: `Article 400(1) of the Moroccan Penal Code: “Les violences ayant entraîné une incapacité de travail n’excédant pas vingt jours sont punies d’un emprisonnement d’un mois à un an et d’une amende de 200 à 500 dirhams ou de l’une de ces deux peines.”`,
    category: "general_assault",
  },
  {
    id: "P392",
    textLaw: `Article 392 of the Moroccan Penal Code: “Quiconque donne intentionnellement la mort à autrui est coupable de meurtre et puni de réclusion perpétuelle ou de vingt à trente ans de réclusion criminelle.”`,
    category: "homicide",
  },
  {
    id: "P502",
    textLaw: `Article 502 of the Moroccan Penal Code: “Tout attentat à la pudeur accompli sans violence est puni d’un emprisonnement d’un mois à deux ans et d’une amende de 500 à 2 000 dirhams.”`,
    category: "public_morality",
  },
  {
    id: "F10",
    textLaw: `Article 10 of the Moroccan Family Code (Law 70‑03): “Le mariage ne peut être contracté qu’avec le libre consentement des futurs époux exprimé en présence de deux adouls.”`,
    category: "family",
  },
  {
    id: "L311",
    textLaw: `Article 311 of the Moroccan Labor Code: “La durée normale du travail est fixée à 44 heures par semaine, soit 2 288 heures par an.”`,
    category: "labor",
  },
  {
    id: "OB19",
    textLaw: `Article 19 of the Moroccan Code of Obligations and Contracts: “La convention est parfaite par l’accord des parties sur les éléments essentiels de l’obligation.”`,
    category: "contract",
  },
];

const embeddings = await gemini.embedContent(
  lawsList.map((law) => law.textLaw)
);

const database = new PineconeDatabase("moroccan-law-db");

// Step 4: Prepare data to upsert into Pinecone
const embReady: SchemaWithCategory[] = lawsList.map((law, idx) => ({
  id: law.id,
  vector: embeddings[idx]!,
  metadata: {
    chunk_text: law.textLaw,
    category: law.category,
  },
}));

database.upsert(embReady);
