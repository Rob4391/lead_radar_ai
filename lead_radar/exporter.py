"""CSV export utilities for Lead Radar AI."""
import csv
from typing import List, Dict


def export_leads_to_csv(leads: List[Dict], path: str):
    """Write a list of lead dicts to CSV.

    Each lead dict should have keys: `url`, `title`, `emails` (list).
    """
    fieldnames = ["url", "title", "emails"]
    with open(path, "w", newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for lead in leads:
            # support new deduped format where leads have `urls`, `titles`, `emails`
            emails = lead.get("emails") or []
            if isinstance(emails, list):
                emails_cell = ";".join(emails)
            else:
                emails_cell = str(emails)

            urls = lead.get("urls") or []
            if isinstance(urls, list):
                url_cell = ";".join(urls)
            else:
                url_cell = str(urls)

            titles = lead.get("titles") or []
            if isinstance(titles, list):
                title_cell = ";".join(titles)
            else:
                title_cell = str(titles)

            row = {"url": url_cell, "title": title_cell, "emails": emails_cell}
            writer.writerow(row)
