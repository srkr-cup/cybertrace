"""
File and Hash Forensics Analyzer.

Computes real cryptographic hashes and identifies file type from magic
bytes (not from the filename extension, which can be spoofed). Never
executes, opens with a native handler, or auto-uploads the file anywhere.

YARA matching: compiles backend/rules/*.yar on first use and genuinely
scans the uploaded file's bytes. If no rules directory/files exist or
yara-python isn't installed, reports "not_configured" rather than faking
a clean result.
"""
import hashlib
import os
import glob

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

router = APIRouter(prefix="/api/analyze/file", tags=["file-analyzer"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB safety limit for this prototype
RULES_DIR = os.path.join(os.path.dirname(__file__), "..", "rules")

_compiled_rules = None
_compiled_rules_error = None


def get_compiled_rules():
    """Compile all .yar files once and cache the result for the process lifetime."""
    global _compiled_rules, _compiled_rules_error
    if _compiled_rules is not None or _compiled_rules_error is not None:
        return _compiled_rules, _compiled_rules_error
    try:
        import yara
    except ImportError:
        _compiled_rules_error = "yara-python is not installed. Run: pip install yara-python"
        return None, _compiled_rules_error

    rule_files = sorted(glob.glob(os.path.join(RULES_DIR, "*.yar")))
    if not rule_files:
        _compiled_rules_error = f"No .yar rule files found in {os.path.abspath(RULES_DIR)}"
        return None, _compiled_rules_error

    try:
        filepaths = {f"rule_{i}": path for i, path in enumerate(rule_files)}
        _compiled_rules = yara.compile(filepaths=filepaths)
        return _compiled_rules, None
    except Exception as e:
        _compiled_rules_error = f"Failed to compile YARA rules: {e}"
        return None, _compiled_rules_error


def run_yara_scan(data: bytes):
    rules, error = get_compiled_rules()
    if error:
        return {"status": "not_configured", "note": error}
    try:
        matches = rules.match(data=data)
        return {
            "status": "ok",
            "match_count": len(matches),
            "matches": [
                {
                    "rule": m.rule,
                    "description": m.meta.get("description", ""),
                    "severity": m.meta.get("severity", "info"),
                }
                for m in matches
            ],
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# (signature bytes, offset, label)
MAGIC_SIGNATURES = [
    (b"%PDF-", 0, "PDF document"),
    (b"\x50\x4b\x03\x04", 0, "ZIP-based archive (docx/xlsx/pptx/zip)"),
    (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", 0, "Legacy MS Office (OLE2) document"),
    (b"\x89PNG\r\n\x1a\n", 0, "PNG image"),
    (b"\xff\xd8\xff", 0, "JPEG image"),
    (b"GIF8", 0, "GIF image"),
    (b"\x7fELF", 0, "ELF executable/binary"),
    (b"MZ", 0, "Windows PE executable (DOS header)"),
    (b"\xca\xfe\xba\xbe", 0, "Mach-O / Java class (fat binary magic)"),
    (b"\x1f\x8b", 0, "GZIP archive"),
    (b"Rar!\x1a\x07", 0, "RAR archive"),
    (b"\x0a\x0d\x0d\x0a", 0, "PCAP-NG capture"),
    (b"\xd4\xc3\xb2\xa1", 0, "PCAP capture (little-endian)"),
    (b"\xa1\xb2\xc3\xd4", 0, "PCAP capture (big-endian)"),
    (b"{", 0, "Possible JSON (unconfirmed — starts with '{')"),
]


def identify_type(data: bytes) -> str:
    for sig, offset, label in MAGIC_SIGNATURES:
        if data[offset:offset + len(sig)] == sig:
            return label
    # heuristic: mostly printable ASCII/UTF-8 -> plain text
    sample = data[:512]
    try:
        sample.decode("utf-8")
        return "Plain text (UTF-8 decodable)"
    except UnicodeDecodeError:
        return "Unknown binary format"


@router.post("")
async def analyze_file(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        return {"error": f"File exceeds {MAX_UPLOAD_BYTES // (1024*1024)}MB limit for this prototype."}

    detected_type = identify_type(data)
    extension_claimed = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""

    mismatch_warning = None
    ext_type_map = {
        "pdf": "PDF document", "png": "PNG image", "jpg": "JPEG image", "jpeg": "JPEG image",
        "gif": "GIF image", "zip": "ZIP-based archive (docx/xlsx/pptx/zip)",
        "docx": "ZIP-based archive (docx/xlsx/pptx/zip)", "xlsx": "ZIP-based archive (docx/xlsx/pptx/zip)",
        "pcap": "PCAP capture (little-endian)", "exe": "Windows PE executable (DOS header)",
    }
    expected = ext_type_map.get(extension_claimed)
    if expected and expected != detected_type and "archive" not in detected_type:
        mismatch_warning = (
            f"File extension '.{extension_claimed}' suggests '{expected}', "
            f"but magic bytes indicate '{detected_type}'. Possible disguised file type."
        )

    return {
        "filename": file.filename,
        "size_bytes": len(data),
        "claimed_extension": extension_claimed or None,
        "detected_type": detected_type,
        "extension_type_mismatch": mismatch_warning,
        "hashes": {
            "md5": hashlib.md5(data).hexdigest(),
            "sha1": hashlib.sha1(data).hexdigest(),
            "sha256": hashlib.sha256(data).hexdigest(),
        },
        "yara_matches": run_yara_scan(data),
        "hash_reputation": {
            "status": "not_configured",
            "note": "Connect VirusTotal in Integrations to check this hash against known-malware databases.",
        },
        "safety_note": "This file was never executed, had macros run, or was opened with a native application.",
    }
