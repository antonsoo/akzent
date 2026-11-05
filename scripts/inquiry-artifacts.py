"""Audit real downloaded CSVs and embedded bytes without importing application code."""
import base64
import csv
import hashlib
import io
import json
import re
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else "test-results/inquiry")
printed = ["hzd", "gsd", "gzþ", "gzd"]
manifest = json.loads(Path("src/asset-manifest.json").read_text())
source_files = [item for item in manifest if item["path"] in [f"sources/verner-{page}.png" for page in [98, 114, 115, 117, 118, 119, 130]]]
results = []
for folder in sorted(path for path in root.iterdir() if path.is_dir()):
    checked_rows = 0
    for name in ["unknown.csv", "impossible.csv", "shared-output.csv", "offline-unknown.csv", "embedded-reading-plan.csv"]:
        rows = list(csv.DictReader(io.StringIO((folder / name).read_text(encoding="utf-8-sig"))))
        assert rows, name
        first = rows[0]
        evidence = [first[key] for key in ["first_evidence", "second_evidence", "third_evidence"]]
        order = first["order_assumption"]
        scenarios = []
        for candidate_order in ["sounds-first", "accent-first"]:
            if order != "unknown" and candidate_order != order:
                continue
            for accent in range(4):
                triple = printed[0 if candidate_order == "accent-first" else accent]
                if all(given == "?" or given == actual for given, actual in zip(evidence, triple)):
                    scenarios.append((str(accent + 1), candidate_order, triple))
        complete = [row for row in rows if row["kind"] == "complete-output"]
        assert sorted((row["older_accent"], row["event_order"]) for row in complete) == sorted((accent, kind) for accent, kind, _ in scenarios)
        for row in complete:
            triple = next(triple for accent, kind, triple in scenarios if accent == row["older_accent"] and kind == row["event_order"])
            assert row["hypothetical_output"] == f"*a{triple[0]}a{triple[1]}a{triple[2]}(am)"
            assert int(row["branch_scenarios"]) == sum(output == triple for _, _, output in scenarios)
        tests = []
        for index, (key, values) in enumerate([("dorsal", "hg"), ("sibilant", "sz"), ("dental", "þd")]):
            if evidence[index] != "?":
                continue
            counts = [sum(triple[index] == value for _, _, triple in scenarios) for value in values]
            tests.append((key, values, index, counts, max(counts)))
        best = min((worst for _, _, _, counts, worst in tests if all(counts)), default=None)
        for key, values, index, counts, worst in tests:
            for value, count in zip(values, counts):
                branches = [row for row in rows if row["kind"] == "possible-reading" and row["test"] == key and row["possible_observation"] == value]
                assert len(branches) == max(1, count)
                actual_ids = [(row["older_accent"], row["event_order"]) for row in branches if row["older_accent"]]
                assert sorted(actual_ids) == sorted((accent, kind) for accent, kind, triple in scenarios if triple[index] == value)
                assert all(int(row["branch_scenarios"]) == count and int(row["largest_branch"]) == worst for row in branches)
                assert all(row["recommended"] == str(bool(all(counts) and worst == best)).lower() for row in branches)
        assert all("114-115" in row["source"] and "not probabilities" in row["scope"] for row in rows)
        checked_rows += len(rows)
    document = (folder / "reading.html").read_text()
    images = [base64.b64decode(value) for value in re.findall(r'data:image/png;base64,([^"\s]+)', document)]
    assert len(images) == 7
    hashes = {hashlib.sha256(data).hexdigest() for data in images}
    assert hashes == {item["sha256"] for item in source_files}
    for name in ["fonts/gentium.ttf", "fonts/hanken-latin.woff2"]:
        item = next(item for item in manifest if item["path"] == name)
        assert base64.b64encode(Path("public", name).read_bytes()).decode() in document
    assert "<button" not in document
    assert "data:application/json;charset=utf-8," in document
    results.append({"case": folder.name, "csv_rows_checked": checked_rows, "embedded_source_pages": len(images), "embedded_fonts_verified": 2})
print(json.dumps({"independent_literal_endpoints": printed, "downloads": results}, indent=2))
