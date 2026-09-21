"""Simple enrichment and scoring utilities.

This module provides lightweight heuristics to score leads for Phase-5.
"""
from typing import Dict, List


def score_lead(lead: Dict) -> float:
    """Compute a simple score for a lead.

    Heuristics:
    - +1.0 if more than one email
    - +0.5 for each URL
    - +0.2 for each title
    """
    score = 0.0
    emails = lead.get("emails") or []
    urls = lead.get("urls") or []
    titles = lead.get("titles") or []
    if len(emails) > 1:
        score += 1.0
    score += 0.5 * len(urls)
    score += 0.2 * len(titles)
    return score


def enrich_leads(leads: List[Dict]) -> List[Dict]:
    out = []
    for l in leads:
        l = dict(l)
        l["score"] = score_lead(l)
        out.append(l)
    return out
