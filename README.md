# Lead Radar AI

Lead Radar AI is a new project for lead discovery and management. This repository contains the initial project plan and supporting files.

## Contents
- `Agency_Lead_Finder_Business_Plan.md` — project plan and notes.

## Getting started
1. Work in the local folder or clone a remote after you create it:

```powershell
# if you create a remote later
git clone <your-remote>
```

2. Edit project files and commit changes.

## Usage

Basic command-line usage:

```powershell
# scan a single URL and export leads
lead-radar run https://example.com

# polite crawl starting at a URL, dedupe results, then export
lead-radar --crawl --dedupe run https://example.com

# dedupe and perform MX validation (requires dnspython)
lead-radar --dedupe --mx-check run https://example.com
```

Notes:
- Deduped output shape: each CSV row contains `emails` (semicolon-separated), `urls` (semicolon-separated), and `titles` (semicolon-separated).
- Leads with no emails are currently preserved under a synthetic grouping; a future change may export these separately.

## License
This project is released under the MIT License. See the `LICENSE` file.
# Lead Radar AI

Project: Lead Radar — find and qualify agency leads using AI.

## What

A workspace for Lead Radar AI: tools to discover, score, and manage potential agency leads.

## Getting started

- Install dependencies (if any) and run the tool from the project root.

## Next steps

- Add core modules: data ingestion, lead-scoring model, CLI/API, persistence.
- Add tests and CI.