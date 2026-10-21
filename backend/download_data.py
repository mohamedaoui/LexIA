import requests
import os
import time
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from extract import FOLDER_PATH

URL = "https://cspj.ma/bibliotheque/legislations"

headers = {
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "accept-language": "en-GB,en;q=0.6",
  "sec-ch-ua": '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "sec-gpc": "1",
  "upgrade-insecure-requests": "1",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
}
s = requests.Session()
s.headers.update(headers)


def download_pdfs():
  if not os.path.exists(FOLDER_PATH):
    os.makedirs(FOLDER_PATH)

  response = requests.get(URL, headers=headers, timeout=10)
  if response.status_code != 200:
    print(f"Failed to retrieve the page: {response.status_code}")
    return

  print("Page retrieved successfully")

  soup = BeautifulSoup(response.text, "html.parser")

  links = soup.find_all(
    "a",
    href=lambda href: href
    and href.startswith("/uploads/files/maktaba/")
    and href.endswith(".pdf"),  # type: ignore
  )

  links = set([link["href"].strip() for link in links])  # type: ignore
  print(f"Found {len(links)} PDF files to download")

  for index, link in enumerate(links, 1):
    pdf_url = urljoin("https://cspj.ma", link)
    pdf_name = os.path.basename(pdf_url)

    print(f"Downloading ({index}/{len(links)}): {pdf_name}")

    try:
      pdf_response = s.get(pdf_url, timeout=30)
      if pdf_response.status_code == 200:
        with open(os.path.join(FOLDER_PATH, pdf_name), "wb") as f:
          f.write(pdf_response.content)
        print(f"Successfully downloaded: {pdf_name}")
        time.sleep(5)
      else:
        print(f"Failed to download {pdf_name}: {pdf_response.status_code}")
    except Exception as e:
      print(f"Error downloading {pdf_name}: {str(e)}")
      time.sleep(5)  # Wait a bit before continuing


if __name__ == "__main__":
  download_pdfs()
