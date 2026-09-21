from lead_radar import core


def test_extract_emails_from_html():
    html = "Contact us at sales@example.com or support@demo.org"
    emails = core.extract_emails_from_html(html)
    assert "sales@example.com" in emails
    assert "support@demo.org" in emails
