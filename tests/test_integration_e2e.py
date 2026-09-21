import os
import tempfile
from unittest import mock

import responses

from lead_radar.crawler import Crawler
from lead_radar import core, validator, exporter


@responses.activate
def test_crawl_extract_dedupe_export(tmp_path):
    # Mock two pages on same domain linking to each other
    base = "https://example.com"
    page_a = base + "/a"
    page_b = base + "/b"

    html_a = '<html><head><title>A</title></head><body><a href="/b">B</a>Contact: alpha@example.com</body></html>'
    html_b = '<html><head><title>B</title></head><body><a href="/a">A</a>Contact: ALPHA@EXAMPLE.com</body></html>'

    responses.add(responses.GET, page_a, body=html_a, status=200)
    responses.add(responses.GET, page_b, body=html_b, status=200)

    c = Crawler()
    # start crawl at the mocked page (example.com/a) so responses intercepts the initial fetch
    pages = c.crawl(page_a, max_pages=10)
    assert page_a in pages and page_b in pages

    collected = []
    for p in pages:
        collected.append(core.find_leads_from_url(p))

    # dedupe
    deduped = validator.dedupe_leads(collected)
    assert len(deduped) == 1

    # mock MX check to always return True
    with mock.patch.object(validator, "mx_check", return_value=True):
        verified = []
        for lead in deduped:
            emails = lead.get("emails") or []
            valid_emails = [e for e in emails if validator.mx_check(e)]
            if valid_emails:
                lead["emails"] = valid_emails
                verified.append(lead)

    assert len(verified) == 1

    # export to CSV
    out = tmp_path / "out.csv"
    exporter.export_leads_to_csv(verified, str(out))
    assert out.exists()
    text = out.read_text()
    assert "alpha@example.com" in text
