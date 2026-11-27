"""
Network and PCAP Analyzer.

Uses Scapy to genuinely parse uploaded .pcap/.pcapng files — real packet
counts, IP/port extraction, protocol distribution. Never claims to detect
malware or C2 from traffic shape alone; flags simple structural patterns
(e.g. a high number of distinct destinations from one source) as
observations only.
"""
import tempfile
import os
from collections import Counter

from fastapi import APIRouter, UploadFile, File

router = APIRouter(prefix="/api/analyze/network", tags=["network-analyzer"])

MAX_PACKETS = 20000  # safety cap for this prototype


def analyze_pcap_bytes_sync(data: bytes, filename: str = "capture.pcap"):
    """
    Core PCAP analysis logic, shared by the synchronous endpoint below and
    the Celery background task in tasks.py — one real implementation, two
    ways to invoke it.
    """
    try:
        from scapy.all import rdpcap, IP, IPv6, TCP, UDP, DNS, DNSQR
    except ImportError:
        return {"error": "scapy is not installed on the backend. Run: pip install scapy"}

    with tempfile.NamedTemporaryFile(suffix=".pcap", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        packets = rdpcap(tmp_path)
    except Exception as e:
        os.unlink(tmp_path)
        return {"error": f"Could not parse this file as a packet capture: {e}"}
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    total = len(packets)
    truncated = total > MAX_PACKETS
    packets = packets[:MAX_PACKETS]

    protocol_counts = Counter()
    src_counts = Counter()
    dst_counts = Counter()
    conn_counts = Counter()
    dns_queries = []
    timestamps = []
    src_to_dst_set = {}

    for pkt in packets:
        try:
            timestamps.append(float(pkt.time))
        except Exception:
            pass

        ip_layer = None
        if IP in pkt:
            ip_layer = pkt[IP]
        elif IPv6 in pkt:
            ip_layer = pkt[IPv6]

        if ip_layer is not None:
            src, dst = ip_layer.src, ip_layer.dst
            src_counts[src] += 1
            dst_counts[dst] += 1
            src_to_dst_set.setdefault(src, set()).add(dst)

            if TCP in pkt:
                protocol_counts["TCP"] += 1
                conn_counts[(src, dst, pkt[TCP].dport)] += 1
            elif UDP in pkt:
                protocol_counts["UDP"] += 1
                conn_counts[(src, dst, pkt[UDP].dport)] += 1
            else:
                protocol_counts[ip_layer.name if hasattr(ip_layer, "name") else "OTHER"] += 1
        else:
            protocol_counts["NON_IP"] += 1

        if DNS in pkt and pkt.haslayer(DNSQR):
            try:
                qname = pkt[DNSQR].qname.decode(errors="ignore").rstrip(".")
                dns_queries.append(qname)
            except Exception:
                pass

    # structural observations only — never framed as confirmed malicious activity
    observations = []
    for src, dsts in src_to_dst_set.items():
        if len(dsts) > 20:
            observations.append({
                "type": "high_fanout_source",
                "detail": f"{src} contacted {len(dsts)} distinct destination IPs — consistent with "
                          f"scanning behavior or a busy proxy/gateway; not conclusive alone.",
            })
    top_conns = conn_counts.most_common(5)
    for (src, dst, port), count in top_conns:
        if count > 200:
            observations.append({
                "type": "high_frequency_connection",
                "detail": f"{src} -> {dst}:{port} seen {count} times in this capture.",
            })

    return {
        "total_packets_in_file": total,
        "packets_analyzed": len(packets),
        "truncated": truncated,
        "time_range": {
            "start": min(timestamps) if timestamps else None,
            "end": max(timestamps) if timestamps else None,
        },
        "protocol_distribution": dict(protocol_counts),
        "top_sources": src_counts.most_common(10),
        "top_destinations": dst_counts.most_common(10),
        "dns_queries_observed": sorted(set(dns_queries))[:200],
        "structural_observations": observations,
        "disclaimer": "Encrypted payloads are never decoded or shown as readable content. These are "
                      "structural observations, not malware/C2 detections.",
    }


@router.post("")
async def analyze_pcap(file: UploadFile = File(...)):
    """Synchronous analysis — fine for typical capture sizes. For very large
    files, use POST /api/jobs/pcap instead to run this in the background."""
    data = await file.read()
    return analyze_pcap_bytes_sync(data, file.filename)
