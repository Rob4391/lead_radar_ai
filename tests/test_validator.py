from lead_radar import validator


def test_normalize_and_extract():
    s = "Sales@Example.COM; other@site.org"
    out = validator.extract_and_normalize(s)
    assert "sales@example.com" in out
    assert "other@site.org" in out


def test_dedupe_simple():
    leads = [
        {"url": "https://a.com", "title": "A", "emails": ["x@e.com"]},
        {"url": "https://b.com", "title": "B", "emails": ["X@E.com"]},
    ]
    deduped = validator.dedupe_leads(leads)
    assert len(deduped) == 1
    item = deduped[0]
    assert item["emails"] == ["x@e.com"]
    assert set(item["urls"]) == {"https://a.com", "https://b.com"}
    assert set(item["titles"]) == {"A", "B"}


def test_mx_check_skipped_if_no_dns_lib():
    # Ensure mx_check returns False if dnspython not available in test env
    if validator.dns is None:
        assert validator.mx_check("test@example.com") is False
    else:
        # If dnspython is available, at least call the function to ensure it returns a bool
        assert isinstance(validator.mx_check("example.com" if "@" not in "example.com" else "test@example.com"), bool)
