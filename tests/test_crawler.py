from lead_radar.crawler import Crawler


def test_crawler_domain_parsing():
    c = Crawler()
    domain = c._domain("https://example.com/path/page.html")
    assert domain == "https://example.com"
