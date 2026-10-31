"""Inspect the actual browser-produced sample; requires Poppler and Pillow."""
import base64
import hashlib
import json
import re
import subprocess
import tempfile
from html import unescape
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
sample = root / "examples"
output = root / "docs/audit"
output.mkdir(exist_ok=True, parents=True)
markup = (sample / "akzent-reading.html").read_text()
record = json.loads(re.search(r'<script type="application/json" id="akzent-record">(.*?)</script>', markup, re.S)[1])
assert record == json.loads((sample / "akzent-notebook.json").read_text())
assert record["inference"]["submitted"]["accent"] == 2
manifest = json.loads((root / "src/asset-manifest.json").read_text())
sha = lambda data: hashlib.sha256(data).hexdigest()
embedded = {}
for mime, text in re.findall(r"data:([^;,]+);base64,([A-Za-z0-9+/=]+)", markup):
    data = base64.b64decode(text, validate=True)
    embedded[sha(data)] = {"mime": mime, "bytes": len(data)}
expected = [f"sources/verner-{page}.png" for page in [98, 114, 115, 117, 118, 119, 130]]
expected += ["fonts/gentium.ttf", "fonts/hanken-latin.woff2"]
identities = []
for name in expected:
    original = (root / "public" / name).read_bytes()
    pinned = next(item for item in manifest if item["path"] == name)
    assert sha(original) == pinned["sha256"]
    assert embedded[sha(original)]["bytes"] == len(original)
    identities.append({"path": name, "bytes": len(original), "sha256": sha(original), "embeddedBytesIdentical": True})
assert len(embedded) == len(expected)
for name in ["gentium-OFL.txt", "hanken-OFL.txt"]:
    assert (root / "public/fonts" / name).read_text() in unescape(markup)
pdf = sample / "akzent-reading.pdf"
commands = {"pdf-info": ["pdfinfo", str(pdf)], "pdf-fonts": ["pdffonts", str(pdf)], "pdf-images": ["pdfimages", "-list", str(pdf)]}
receipts = {}
for name, args in commands.items():
    receipts[name] = subprocess.check_output(args, text=True)
    (output / f"{name}.txt").write_text(receipts[name])
assert "JavaScript:      no" in receipts["pdf-info"]
assert all(line.split()[-5] == "yes" for line in receipts["pdf-fonts"].splitlines()[2:] if line.strip())
pixels = []
with tempfile.TemporaryDirectory(prefix="akzent-reading-") as folder:
    subprocess.run(["pdfimages", "-png", str(pdf), str(Path(folder) / "page")], check=True)
    extracted = sorted(Path(folder).glob("page-*.png"))
    assert len(extracted) == 7
    for page, path in zip([98, 114, 115, 117, 118, 119, 130], extracted):
        left = Image.open(path).convert("RGB")
        right = Image.open(root / "public/sources" / f"verner-{page}.png").convert("RGB")
        assert left.size == right.size
        assert left.tobytes() == right.tobytes()
        pixels.append({"sourcePage": page, "size": left.size, "pdfPixelsIdentical": True})
text = subprocess.check_output(["pdftotext", str(pdf), "-"], text=True)
for phrase in ["Inferring the older accent", "Only older accent position 3", "SIL OPEN FONT LICENSE"]:
    assert phrase in text, phrase
files = {path.name: {"bytes": path.stat().st_size, "sha256": sha(path.read_bytes())} for path in sorted(sample.iterdir()) if path.is_file()}
report = {"files": files, "portableNotebookMatchesEditableJson": True, "embeddedAssets": identities, "fontLicenseTextsEmbeddedExactly": True, "pdfPages": int(re.search(r"Pages:\s+(\d+)", receipts["pdf-info"])[1]), "pdfUsedFontsEmbedded": True, "pdfSourcePixels": pixels, "boundary": "Byte identities in standalone HTML; decoded RGB equality in the browser-produced PDF. No PDF/UA or independent philological-review claim."}
(output / "artifacts.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(f"Verified {len(identities)} embedded assets, both full font licenses, notebook equality and all seven decoded source images in the {report['pdfPages']}-page PDF.")
