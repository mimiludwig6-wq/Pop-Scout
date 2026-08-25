#!/usr/bin/env python3
"""
Create and populate the Pop Scout Notion databases.

Creates `Pop Scout — Sources` and `Pop Scout — Artists` with correct property
types and a live relation between them, then imports every row from the CSVs
in this directory.

Usage:
    export NOTION_TOKEN=ntn_xxxxx          # your own integration secret
    export NOTION_PARENT_PAGE_ID=xxxxx     # page the databases get created under
    python3 setup_notion.py

Setup, once:
  1. https://www.notion.so/my-integrations -> "New integration" -> copy the secret.
  2. Make (or pick) a Notion page to hold the databases.
  3. On that page: ••• menu -> Connections -> add your integration.
  4. The page ID is the 32-char hex string in its URL.

Stdlib only — nothing to install. Safe to re-run: it creates fresh databases
each time rather than editing existing ones.
"""

import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://api.notion.com/v1"
VERSION = "2022-06-28"
HERE = os.path.dirname(os.path.abspath(__file__))

TOKEN = os.environ.get("NOTION_TOKEN")
PARENT = os.environ.get("NOTION_PARENT_PAGE_ID")

if not TOKEN or not PARENT:
    sys.exit(
        "Set NOTION_TOKEN and NOTION_PARENT_PAGE_ID first — see the docstring at "
        "the top of this file."
    )

PARENT = PARENT.replace("-", "").strip()


def call(method, path, payload=None):
    """One Notion API request, with retry on rate limit."""
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        f"{API}{path}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Notion-Version": VERSION,
            "Content-Type": "application/json",
        },
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            detail = e.read().decode()
            if e.code == 429:
                time.sleep(2 ** attempt)
                continue
            sys.exit(f"\nNotion API {e.code} on {method} {path}:\n{detail}\n")
    sys.exit("Rate limited repeatedly — try again in a minute.")


def select(*options):
    return {"select": {"options": [{"name": o} for o in options]}}


def read_csv(name):
    with open(os.path.join(HERE, name), newline="") as f:
        return list(csv.DictReader(f))


def txt(v):
    return {"rich_text": [{"text": {"content": v[:2000]}}] if v else []}


def num(v):
    try:
        return {"number": float(v)}
    except (TypeError, ValueError):
        return {"number": None}


def url(v):
    return {"url": v or None}


def date(v):
    return {"date": {"start": v} if v else None}


def sel(v):
    return {"select": {"name": v} if v else None}


# --------------------------------------------------------------- Sources DB

print("Creating  Pop Scout — Sources ...", end=" ", flush=True)

sources_db = call("POST", "/databases", {
    "parent": {"type": "page_id", "page_id": PARENT},
    "title": [{"type": "text", "text": {"content": "Pop Scout — Sources"}}],
    "properties": {
        "Name": {"title": {}},
        "URL": {"url": {}},
        "Type": select("Newsletter", "Instagram", "Press", "Community",
                       "Radio", "Discovery Tool", "Trade"),
        "Status": select("Active", "Registered", "Dead End"),
        "Cadence": select("Weekly", "Monthly", "Annual", "Continuous"),
        "Last Mined": {"date": {}},
        "Notes": {"rich_text": {}},
    },
})
SOURCES_ID = sources_db["id"]
print("ok")

source_rows = read_csv("sources.csv")
source_page_ids = {}

print(f"Importing {len(source_rows)} sources ", end="", flush=True)
for row in source_rows:
    page = call("POST", "/pages", {
        "parent": {"database_id": SOURCES_ID},
        "properties": {
            "Name": {"title": [{"text": {"content": row["Name"]}}]},
            "URL": url(row["URL"]),
            "Type": sel(row["Type"]),
            "Status": sel(row["Status"]),
            "Last Mined": date(row["Last Mined"]),
            "Notes": txt(row["Notes"]),
        },
    })
    source_page_ids[row["Name"]] = page["id"]
    print(".", end="", flush=True)
    time.sleep(0.34)          # stay under Notion's 3 req/sec limit
print(" done")


# --------------------------------------------------------------- Artists DB

print("Creating  Pop Scout — Artists ...", end=" ", flush=True)

GENRES = sorted({
    g.strip()
    for row in read_csv("artists.csv")
    for g in row["Genre"].split(",")
    if g.strip()
})

FORMULA = (
    'if(empty(prop("Monthly Listeners")) or empty(prop("Top Track Streams")), '
    '"⚠️ Incomplete", '
    'if(prop("Monthly Listeners") < 100000 and prop("Top Track Streams") < 1000000, '
    '"✅ Qualifies", "📈 Over cap"))'
)

artists_db = call("POST", "/databases", {
    "parent": {"type": "page_id", "page_id": PARENT},
    "title": [{"type": "text", "text": {"content": "Pop Scout — Artists"}}],
    "properties": {
        "Name": {"title": {}},
        "Genre": {"multi_select": {"options": [{"name": g} for g in GENRES]}},
        "Status": select("Qualifies", "Established", "Off Genre", "Unverified"),
        "Monthly Listeners": {"number": {"format": "number"}},
        "Top Track": {"rich_text": {}},
        "Top Track Streams": {"number": {"format": "number"}},
        "Meets Criteria": {"formula": {"expression": FORMULA}},
        "Signal": {"rich_text": {}},
        "Source": {"relation": {"database_id": SOURCES_ID,
                                "type": "dual_property",
                                "dual_property": {}}},
        "Source URL": {"url": {}},
        "Spotify URL": {"url": {}},
        "Spotify Artist ID": {"rich_text": {}},
        "Image URL": {"url": {}},
        "Checked At": {"date": {}},
        "Last Synced": {"date": {}},
        "Shortlisted": {"checkbox": {}},
        "Priority": select("High", "Medium", "Low"),
        "Rep Status": select("Unrepresented", "Has Booking", "Has Label",
                             "Has Mgmt", "Unknown"),
        "Label": {"rich_text": {}},
        "Territory": select("US", "UK", "EU", "AU", "Other"),
        "Socials": {"rich_text": {}},
        "Notes": {"rich_text": {}},
    },
})
ARTISTS_ID = artists_db["id"]
print("ok")

artist_rows = read_csv("artists.csv")
unmatched = set()

print(f"Importing {len(artist_rows)} artists ", end="", flush=True)
for row in artist_rows:
    props = {
        "Name": {"title": [{"text": {"content": row["Name"]}}]},
        "Genre": {"multi_select": [{"name": g.strip()}
                                   for g in row["Genre"].split(",") if g.strip()]},
        "Status": sel(row["Status"]),
        "Monthly Listeners": num(row["Monthly Listeners"]),
        "Top Track": txt(row["Top Track"]),
        "Top Track Streams": num(row["Top Track Streams"]),
        "Signal": txt(row["Signal"]),
        "Source URL": url(row["Source URL"]),
        "Spotify URL": url(row["Spotify URL"]),
        "Spotify Artist ID": txt(row["Spotify Artist ID"]),
        "Image URL": url(row["Image URL"]),
        "Checked At": date(row["Checked At"]),
        "Shortlisted": {"checkbox": row["Shortlisted"].strip().lower() == "yes"},
    }

    sid = source_page_ids.get(row["Source"])
    if sid:
        props["Source"] = {"relation": [{"id": sid}]}
    elif row["Source"]:
        unmatched.add(row["Source"])

    page = call("POST", "/pages", {"parent": {"database_id": ARTISTS_ID}, "properties": props})

    if row["Image URL"]:
        call("PATCH", f"/pages/{page['id']}", {
            "cover": {"type": "external", "external": {"url": row["Image URL"]}}
        })
        time.sleep(0.34)

    print(".", end="", flush=True)
    time.sleep(0.34)
print(" done")

if unmatched:
    print("\nSources named on artists but missing from sources.csv:")
    for s in sorted(unmatched):
        print(f"  - {s}")

print(f"""
Both databases are live.

  Artists   https://notion.so/{ARTISTS_ID.replace('-', '')}
  Sources   https://notion.so/{SOURCES_ID.replace('-', '')}

Put these in the web app's .env.local:

  NOTION_TOKEN={'<the token you exported>'}
  NOTION_ARTISTS_DB={ARTISTS_ID}
  NOTION_SOURCES_DB={SOURCES_ID}

Next in Notion: add the two rollups on Sources (Artists Found, Qualifiers Found)
— rollups can't be created through the API, so they're a UI step. SCHEMA.md has
the settings.
""")
