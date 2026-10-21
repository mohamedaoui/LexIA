# Vérifie les certificats HTTPS avec le magasin du système d'exploitation plutôt qu'avec
# celui de Python (certifi). Nécessaire quand un antivirus ou un proxy inspecte le HTTPS
# (téléchargement du modèle Hugging Face, appels à l'API Gemini).
try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass
