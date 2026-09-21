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
    """Deduplicate leads by email address; merge titles and urls for duplicates."""
    seen: Dict[str, Dict] = {}
    for lead in leads:
        emails = lead.get("emails") or []
        if isinstance(emails, str):
            emails = extract_and_normalize(emails)
        else:
            emails = [normalize_email(e) for e in emails]

        if not emails:
            # keep leads without emails with a unique synthetic id
            key = f"__noemail__::{lead.get('url','')}"
            if key not in seen:
                seen[key] = {"url": lead.get("url"), "title": lead.get("title"), "emails": []}
            continue

        for e in emails:
            if e in seen:
                # merge urls/titles
                if lead.get("url") and lead.get("url") not in (seen[e].get("url") or ""):
                    # append URL to a list-like field
                    prev = seen[e].get("url")
                    if isinstance(prev, list):
                        prev.append(lead.get("url"))
                    else:
                        seen[e]["url"] = [prev, lead.get("url")] if prev else lead.get("url")
            else:
                seen[e] = {"url": lead.get("url"), "title": lead.get("title"), "emails": [e]}

    return list(seen.values())


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
