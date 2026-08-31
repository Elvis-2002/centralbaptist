#!/usr/bin/env python3
"""
Checks every local href/src reference in the site's HTML files and
reports any that point to a file that doesn't exist. Ignores external
links (http/https), mailto:, tel:, and #anchors within the same page.

Usage (from the church-site folder):
    python3 tests/check_links.py
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LINK_PATTERN = re.compile(r'(?:href|src)="([^"]+)"')

def is_local(link: str) -> bool:
    return not (
        link.startswith("http://")
        or link.startswith("https://")
        or link.startswith("mailto:")
        or link.startswith("tel:")
        or link.startswith("#")
        or link.startswith("//")
    )

def check_file(path: str) -> list:
    problems = []
    with open(path, encoding="utf-8") as fh:
        content = fh.read()

    page_dir = os.path.dirname(path)

    for link in LINK_PATTERN.findall(content):
        if not is_local(link):
            continue
        clean = link.split("#")[0].split("?")[0]
        if not clean:
            continue
        target = os.path.normpath(os.path.join(page_dir, clean))
        if not os.path.exists(target):
            problems.append(link)

    return problems

def main():
    html_files = []
    for dirpath, _, filenames in os.walk(ROOT):
        if "node_modules" in dirpath:
            continue
        for name in filenames:
            if name.endswith(".html"):
                html_files.append(os.path.join(dirpath, name))

    total_problems = 0
    for path in sorted(html_files):
        problems = check_file(path)
        rel = os.path.relpath(path, ROOT)
        if problems:
            total_problems += len(problems)
            print(f"FAIL  {rel}")
            for p in problems:
                print(f"      broken reference: {p}")
        else:
            print(f"OK    {rel}")

    print()
    if total_problems:
        print(f"{total_problems} broken local reference(s) found.")
        sys.exit(1)
    else:
        print("All local references resolved successfully.")
        sys.exit(0)

if __name__ == "__main__":
    main()
