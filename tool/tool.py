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
    parser.add_argument("run", nargs="*", help="Run a subcommand (placeholder)")
    args = parser.parse_args(argv)

    if args.version:
        print("lead-radar 0.1.0")
        return 0

    if args.run is not None:
        from lead_radar import core
        targets = args.run if args.run else []
        for t in targets:
            print(f"Scanning: {t}")
            try:
                res = core.find_leads_from_url(t)
                print(res)
            except Exception as e:
                print(f"Error scanning {t}: {e}")
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
