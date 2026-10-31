"""Compare independently downloaded PDF page renders with retained source images.

Usage: python3 scripts/verify-source-pages.py /path/to/77512.pdf
Requires Poppler and Pillow. The PDF is supplied explicitly; this script never
substitutes an existing image for a fresh render.
"""
import hashlib
import json
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
pdf = Path(sys.argv[1])
provenance = json.loads((root / 'public/sources/provenance.json').read_text())
sha = lambda data: hashlib.sha256(data).hexdigest()
pdf_bytes = pdf.read_bytes()
assert sha(pdf_bytes) == provenance['pdfSha256'], 'Downloaded PDF differs from the declared primary source.'
version = subprocess.run(['pdftoppm', '-v'], capture_output=True, text=True, check=True).stderr.splitlines()[0]
with tempfile.TemporaryDirectory(prefix='akzent-primary-pages-') as directory:
    def compare(page):
        prefix = Path(directory) / f"fresh-{page['page']}"
        args = ['pdftoppm', '-f', str(page['pdfPage']), '-l', str(page['pdfPage']), '-singlefile', '-scale-to', '2600', '-gray', '-png', str(pdf), str(prefix)]
        subprocess.run(args, check=True, capture_output=True)
        fresh_path = prefix.with_suffix('.png')
        retained_path = root / 'public/sources' / page['file']
        fresh = Image.open(fresh_path).convert('RGB')
        retained = Image.open(retained_path).convert('RGB')
        assert fresh.size == retained.size, page['file']
        assert fresh.tobytes() == retained.tobytes(), page['file']
        fresh_bytes = fresh_path.read_bytes()
        retained_bytes = retained_path.read_bytes()
        return {**page, 'dimensions': fresh.size, 'freshRenderSha256': sha(fresh_bytes), 'retainedSha256': sha(retained_bytes), 'freshPngBytesIdentical': fresh_bytes == retained_bytes, 'decodedRgbPixelsIdentical': True}
    with ThreadPoolExecutor(max_workers=3) as pool:
        pages = list(pool.map(compare, provenance['pages']))
report = {'checkedAtUtc': datetime.now(timezone.utc).isoformat(), 'primaryPdf': provenance['pdf'], 'pdfBytes': len(pdf_bytes), 'pdfSha256': sha(pdf_bytes), 'pdfIdentityMatchesProvenance': True, 'renderer': version, 'renderParameters': ['-singlefile', '-scale-to', '2600', '-gray', '-png'], 'pages': pages, 'boundary': 'Fresh renders from the independently downloaded primary volume, complete page dimensions and decoded RGB equality. Philological transcription and translation still require reading the printed pages.'}
out = root / 'docs/audit/primary-page-renders.json'
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(f"Primary PDF identity and fresh complete-page renders agree for all {len(pages)} retained images.")
