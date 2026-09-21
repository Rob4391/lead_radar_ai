"""Polite crawler utilities for Lead Radar AI (Phase 3).

Uses robots.txt, per-host rate limiting, and a simple BFS crawl to collect pages.
This is intentionally simple and synchronous for Phase 3 initial implementation.
"""
from __future__ import annotations

import time
import urllib.parse
from collections import deque
from typing import List, Set, Dict

import requests
from bs4 import BeautifulSoup
from urllib.robotparser import RobotFileParser


class Crawler:
    def __init__(self, user_agent: str = "lead-radar-bot", delay: float = 1.0):
        self.user_agent = user_agent
        self.delay = delay
        self.last_access: Dict[str, float] = {}
        self.robots_cache: Dict[str, RobotFileParser] = {}

    def _domain(self, url: str) -> str:
        p = urllib.parse.urlparse(url)
        return p.scheme + "://" + p.netloc

    def _wait_if_needed(self, domain: str):
        last = self.last_access.get(domain)
        if last is not None:
            elapsed = time.time() - last
            if elapsed < self.delay:
                time.sleep(self.delay - elapsed)

    def _get_robots(self, domain: str) -> RobotFileParser:
        if domain in self.robots_cache:
            return self.robots_cache[domain]
        robots_url = urllib.parse.urljoin(domain, "/robots.txt")
        rp = RobotFileParser()
        try:
            resp = requests.get(robots_url, timeout=5)
            if resp.status_code == 200:
                # RobotFileParser.parse expects an iterable of lines
                rp.parse(resp.text.splitlines())
            else:
                # Empty rules allow everything
                rp.parse([])
        except Exception:
            rp.parse([])
        self.robots_cache[domain] = rp
        return rp

    def allowed(self, url: str) -> bool:
        domain = self._domain(url)
        rp = self._get_robots(domain)
        return rp.can_fetch(self.user_agent, url)

    def fetch(self, url: str) -> str:
        domain = self._domain(url)
        self._wait_if_needed(domain)
        headers = {"User-Agent": self.user_agent}
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        self.last_access[domain] = time.time()
        return resp.text

    def crawl(self, start_url: str, max_pages: int = 20) -> List[str]:
        """Crawl starting from `start_url` and return list of visited page URLs.

        Simple BFS: follow internal links only, respect robots and `self.delay`.
        """
        visited: Set[str] = set()
        out: List[str] = []
        q = deque([start_url])
        start_domain = self._domain(start_url)

        while q and len(visited) < max_pages:
            url = q.popleft()
            if url in visited:
                continue
            if not self.allowed(url):
                visited.add(url)
                continue
            try:
                html = self.fetch(url)
            except Exception:
                visited.add(url)
                continue
            visited.add(url)
            out.append(url)
            # parse links
            try:
                soup = BeautifulSoup(html, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = urllib.parse.urljoin(url, a["href"])
                    # only follow same-domain links
                    if self._domain(href) == start_domain and href not in visited:
                        q.append(href)
            except Exception:
                pass

        return out
