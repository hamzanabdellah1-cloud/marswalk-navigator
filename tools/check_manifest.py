#!/usr/bin/env python3
"""Gate: an asset file may exist only if its manifest entry has source, credit and date."""
import json, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
m = json.load(open(os.path.join(root, "data", "manifest.json")))
REQ = ["source_name", "source_url", "credit", "retrieved_on"]
bad = 0
print(f"{'ID':14} {'STATE':9} NOTES")
for a in m["assets"]:
    p = os.path.join(root, a["path"])
    if not os.path.exists(p):
        print(f"{a['id']:14} {'MISSING':9} file not added yet (ok)")
        continue
    problems = [k for k in REQ if not str(a.get(k, "")).strip() or "TODO" in str(a.get(k, ""))]
    if a["kind"] == "route" and not str(a.get("measured_with", "")).strip():
        problems.append("measured_with")
    if a["kind"] == "weather":
        try:
            j = json.load(open(p))
            problems += [f"json:{k}" for k in ("sols", "units", "location", "rdr_product") if k not in j]
        except Exception as e:
            problems.append(f"unreadable json ({e})")
    if problems:
        bad += 1
        print(f"{a['id']:14} {'BLOCKED':9} present but missing: {', '.join(problems)}")
    else:
        print(f"{a['id']:14} {'OK':9} {a['path']}")
print("\nResult:", "FAIL (fix BLOCKED items or remove the files)" if bad else "PASS")
sys.exit(1 if bad else 0)
