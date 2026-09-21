#!/usr/bin/env python3
"""Lead Radar AI - Phase 1 CLI scaffold

Simple entrypoint for phase-1 development. Expand this with core functionality.
"""
import argparse
import sys


def main(argv=None):
    parser = argparse.ArgumentParser(prog="lead-radar", description="Lead Radar AI - phase 1 tool")
    parser.add_argument("--version", action="store_true", help="Show version")
    parser.add_argument("--config", type=str, help="Path to config file")
    parser.add_argument("--crawl", action="store_true", help="Perform polite crawl of targets")
    parser.add_argument("--max-pages", type=int, default=10, help="Maximum pages to crawl per target")
    parser.add_argument("--dedupe", action="store_true", help="Deduplicate collected leads and normalize emails")
    parser.add_argument("--store", action="store_true", help="Persist deduped leads to local SQLite DB (leads.db)")
    parser.add_argument("--mx-check", action="store_true", help="Perform MX record validation for deduped emails (requires dnspython)")
    parser.add_argument("run", nargs="*", help="Run a subcommand or list of target URLs")
    args = parser.parse_args(argv)

    if args.version:
        print("lead-radar 0.1.0")
        return 0

    if args.run is not None:
        from lead_radar import core, exporter
        targets = args.run if args.run else []
        collected = []
        if args.crawl:
            from lead_radar.crawler import Crawler

            crawler = Crawler()
            for t in targets:
                print(f"Crawling: {t} (max {args.max_pages} pages)")
                try:
                    pages = crawler.crawl(t, max_pages=args.max_pages)
                    for p in pages:
                        try:
                            res = core.find_leads_from_url(p)
                            print(res)
                            collected.append(res)
                        except Exception as e:
                            print(f"Error scanning {p}: {e}")
                except Exception as e:
                    print(f"Error crawling {t}: {e}")
        else:
            for t in targets:
                print(f"Scanning: {t}")
                try:
                    res = core.find_leads_from_url(t)
                    print(res)
                    collected.append(res)
                except Exception as e:
                    print(f"Error scanning {t}: {e}")

        if collected:
            if args.dedupe:
                from lead_radar import validator
                from lead_radar import storage

                collected = validator.dedupe_leads(collected)
                print(f"Deduplicated leads to {len(collected)} unique entries")
                if args.mx_check:
                    # perform MX checks and filter out invalid domains
                    verified = []
                    for lead in collected:
                        emails = lead.get("emails") or []
                        valid_emails = []
                        for e in emails:
                            if validator.mx_check(e):
                                valid_emails.append(e)
                        if valid_emails:
                            lead["emails"] = valid_emails
                            verified.append(lead)
                    collected = verified
                    print(f"After MX-check, {len(collected)} leads remain")

                # enrich and optionally store
                from lead_radar import enrich
                collected = enrich.enrich_leads(collected)

                if args.store:
                    db_path = "leads.db"
                    storage.init_db(db_path)
                    storage.save_leads(db_path, collected)
                    print(f"Stored {len(collected)} leads to {db_path}")

            out = "leads.csv"
            exporter.export_leads_to_csv(collected, out)
            print(f"Exported {len(collected)} leads to {out}")
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
