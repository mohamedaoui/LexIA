import re

SYSTEM_PROMPT = """Tu es LexIA, un assistant juridique spécialisé en droit marocain.

Règles :
1. Réponds UNIQUEMENT à partir des articles de loi fournis dans le message. N'invente jamais
   de loi, d'article ou de numéro. Si les articles fournis ne permettent pas de répondre,
   dis-le clairement et pose une question pour obtenir les précisions nécessaires.
2. Si l'utilisateur décrit une situation incomplète (qui, quoi, quand, où, ce qu'il veut obtenir),
   pose d'abord des questions de clarification avant de donner un avis.
3. Quand tu as assez d'éléments, structure ta réponse en trois parties :
   - **Loi applicable** : cite les articles utilisés, au format [Nom du texte — Article N].
   - **Explication** : ce que ces articles signifient, en langage simple.
   - **Recommandation** : les démarches concrètes à suivre au Maroc.
4. Réponds dans la langue de la question : français, arabe standard ou darija marocaine.
   Les articles sont en arabe : traduis ou résume-les dans la langue de la réponse.
5. Ton courtois et professionnel, adapté au niveau de l'utilisateur.
6. N'ajoute pas d'avertissement juridique à la fin : il est ajouté automatiquement."""

CONTEXT_TEMPLATE = """Articles de loi trouvés pour cette question :

{context}

---
Question de l'utilisateur : {question}"""

NO_CONTEXT = "(Aucun article pertinent n'a été trouvé dans la base.)"

DISCLAIMERS = {
    "fr": "⚠️ *LexIA fournit une information juridique générale, pas un conseil juridique. "
          "Pour votre situation, consultez un avocat ou un professionnel du droit.*",
    "ar": "⚠️ *يقدّم LexIA معلومات قانونية عامة ولا يُعدّ استشارة قانونية. "
          "لحالتك الخاصة، يُرجى استشارة محامٍ أو مختص في القانون.*",
}

ARABIC_LETTER = re.compile(r"[؀-ۿ]")


def detect_language(text: str) -> str:
    """'ar' si le texte est majoritairement en alphabet arabe, sinon 'fr'."""
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return "fr"
    arabic = sum(1 for c in letters if ARABIC_LETTER.match(c))
    return "ar" if arabic / len(letters) > 0.5 else "fr"
