"""Core lead extraction utilities for Lead Radar AI."""
from typing import List, Dict
import requests
from bs4 import BeautifulSoup


def extract_emails_from_html(html: str) -> List[str]:
    """Naively extract email-like patterns from HTML text."""
    import re
    # simple regex for demonstration; refine in production
    pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    return list(set(re.findall(pattern, html)))


def fetch_page(url: str, timeout: int = 10) -> str:
    resp = requests.get(url, timeout=timeout)
    resp.raise_for_status()
    return resp.text


def find_leads_from_url(url: str) -> Dict[str, object]:
    """Fetch URL and return structured lead data.

    Returns a dict with `url`, `title`, and `emails`.
    """
    html = fetch_page(url)
    emails = extract_emails_from_html(html)
    # extract page title
    try:
        soup = BeautifulSoup(html, "html.parser")
        title = soup.title.string.strip() if soup.title and soup.title.string else ""
    except Exception:
        title = ""
    return {"url": url, "title": title, "emails": emails}


if __name__ == "__main__":
    print(find_leads_from_url("https://example.com"))
