import requests

API_URL = "http://192.168.11.100:5555/translate"


def translate(text: str, source_lang: str = "ar", target_lang: str = "en") -> str:
  payload = {"q": text, "source": source_lang, "target": target_lang, "format": "text"}

  response = requests.post(API_URL, json=payload)

  if response.status_code == 200:
    return response.json().get("translatedText", "")
  else:
    raise Exception(f"Error {response.status_code}: {response.text}")
