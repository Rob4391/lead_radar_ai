"""Email normalization, deduplication, and validation utilities."""
from typing import List, Dict, Set
import re

try:
    import dns.resolver
except Exception:
    dns = None


EMAIL_RE = re.compile(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)")


def normalize_email(email: str) -> str:
    """Normalize email for deduplication: strip, lowercase."""
    return email.strip().lower()


def extract_and_normalize(emails_field: str) -> List[str]:
    """Given a string (possibly with semicolon-separated emails), extract and normalize emails."""
    if not emails_field:
        return []
    parts = re.split(r"[;,\s]+", emails_field)
    out = []
    for p in parts:
        m = EMAIL_RE.search(p)
        if m:
            out.append(normalize_email(m.group(1)))
    return out


def dedupe_leads(leads: List[Dict]) -> List[Dict]:
    """Deduplicate leads by email address; merge titles and urls for duplicates.

    Output format for each unique lead:
    {
      "emails": [email1, email2, ...],
      "urls": [url1, url2, ...],
      "titles": [title1, title2, ...]
    }
    """
    seen: Dict[str, Dict] = {}
    no_email_counter = 0

    def add_lead_for_email(email_key: str, lead: Dict):
        entry = seen.setdefault(email_key, {"emails": set(), "urls": [], "titles": []})
        # emails
        entry["emails"].add(email_key)
        # urls
        u = lead.get("url")
        if u:
            if isinstance(entry["urls"], list):
                if u not in entry["urls"]:
                    entry["urls"].append(u)
        # titles
        t = lead.get("title")
        if t:
            if t not in entry["titles"]:
                entry["titles"].append(t)

    for lead in leads:
        emails = lead.get("emails") or []
        if isinstance(emails, str):
            emails = extract_and_normalize(emails)
        else:
            emails = [normalize_email(e) for e in emails]

        if not emails:
            # keep leads without emails under a synthetic key
            key = f"__noemail__::{no_email_counter}"
            no_email_counter += 1
            seen[key] = {"emails": set(), "urls": [lead.get("url")] if lead.get("url") else [], "titles": [lead.get("title")] if lead.get("title") else []}
            continue

        for e in emails:
            add_lead_for_email(e, lead)

    # convert sets to sorted lists for determinism
    out: List[Dict] = []
    for k, v in seen.items():
        emails_list = sorted(v["emails"]) if v.get("emails") else []
        urls = v.get("urls", [])
        titles = v.get("titles", [])
        out.append({"emails": emails_list, "urls": urls, "titles": titles})

    return out


def mx_check(email: str) -> bool:
    """Perform an MX record check for the email's domain. Returns True if MX found.

    If `dnspython` is not installed or DNS lookup fails, conservatively return False.
    """
    if dns is None:
        return False
    try:
        domain = email.split("@", 1)[1]
        answers = dns.resolver.resolve(domain, "MX")
        return len(answers) > 0
    except Exception:
        return False
