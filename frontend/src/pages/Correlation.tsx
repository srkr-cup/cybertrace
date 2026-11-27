import { useEffect, useRef, useState } from "react";
import { api, Case, Graph, GraphNode } from "../api";

const TYPE_COLOR: Record<string, string> = {
  email: "#3b5bfd",
  domain: "#f59e0b",
  url: "#ef4444",
  ip: "#10b981",
  hash: "#8b5cf6",
  phone: "#0891b2",
};

type SimNode = GraphNode & { x: number; y: number; vx: number; vy: number };

export default function Correlation() {
  const [cases, setCases] = useState<Case[]>([]);
  const [caseId, setCaseId] = useState<string>("");
  const [graph, setGraph] = useState<Graph | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [resetCount, setResetCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<SimNode[]>([]);

  useEffect(() => {
    api.listCases().then((cs) => {
      setCases(cs);
      if (cs.length > 0) setCaseId(cs[0].id);
    });
  }, []);

  useEffect(() => {
    if (!caseId) return;
    api.getGraph(caseId).then(setGraph).catch(() => setGraph(null));
  }, [caseId]);

  // init sim nodes whenever graph changes
  useEffect(() => {
    if (!graph) { nodesRef.current = []; return; }
    const w = 760, h = 520;
    nodesRef.current = graph.nodes.map((n) => ({
      ...n,
      x: w / 2 + (Math.random() - 0.5) * 300,
      y: h / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
    }));
  }, [graph, resetCount]);

  // simple force simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width, h = canvas.height;
    let raf: number;

    const tick = () => {
      const nodes = nodesRef.current;
      const edges = graph.edges;

      // repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let dist2 = dx * dx + dy * dy || 0.01;
          const force = 1800 / dist2;
          const dist = Math.sqrt(dist2);
          dx /= dist; dy /= dist;
          a.vx += dx * force; a.vy += dy * force;
          b.vx -= dx * force; b.vy -= dy * force;
        }
      }
      // attraction along edges
      for (const e of edges) {
        const a = nodes.find((n) => n.id === e.source);
        const b = nodes.find((n) => n.id === e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (dist - 140) * 0.01;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
      // center gravity + integrate + damping
      for (const n of nodes) {
        n.vx += (w / 2 - n.x) * 0.0015;
        n.vy += (h / 2 - n.y) * 0.0015;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(30, Math.min(w - 30, n.x));
        n.y = Math.max(30, Math.min(h - 30, n.y));
      }

      // draw
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);

      const visibleNodes = nodes.filter((node) =>
        (typeFilter === "all" || node.type === typeFilter)
        && node.value.toLowerCase().includes(search.toLowerCase()),
      );
      const visibleIds = new Set(visibleNodes.map((node) => node.id));
      ctx.lineWidth = 1.5;
      for (const e of edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))) {
        const a = nodes.find((n) => n.id === e.source);
        const b = nodes.find((n) => n.id === e.target);
        if (!a || !b) continue;
        ctx.strokeStyle = e.confidence === "observed" ? "#cbd5e1" : "#fda4af";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (const n of visibleNodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = TYPE_COLOR[n.type] || "#64748b";
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        const label = n.value.length > 18 ? n.value.slice(0, 16) + "…" : n.value;
        ctx.fillText(label, n.x, n.y + 30);
      }
      ctx.restore();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [graph, zoom, typeFilter, search]);

  const handleClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ev.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const displayedX = (ev.clientX - rect.left) * canvas.width / rect.width;
    const displayedY = (ev.clientY - rect.top) * canvas.height / rect.height;
    const x = (displayedX - canvas.width / 2) / zoom + canvas.width / 2;
    const y = (displayedY - canvas.height / 2) / zoom + canvas.height / 2;
    const hit = nodesRef.current.find((node) =>
      (typeFilter === "all" || node.type === typeFilter)
      && node.value.toLowerCase().includes(search.toLowerCase())
      && Math.hypot(node.x - x, node.y - y) < 16,
    );
    setSelectedEdge(null);
    setSelectedNode(hit || null);
  };

  const visibleNodes = (graph?.nodes || []).filter((node) =>
    (typeFilter === "all" || node.type === typeFilter)
    && node.value.toLowerCase().includes(search.toLowerCase()),
  );
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = (graph?.edges || []).filter((edge) =>
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  );

  const resetGraph = () => {
    setZoom(1);
    setSelectedNode(null);
    setResetCount((count) => count + 1);
  };

  const exportGraph = () => {
    if (!graph) return;
    const blob = new Blob([JSON.stringify({ case_id: caseId, nodes: visibleNodes, edges: visibleEdges }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `case-${caseId.slice(0, 8)}-evidence-graph.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Evidence Correlation</h1>
          <p className="text-sm text-slate-500">Directly observed relationships between extracted indicators.</p>
        </div>
        <select
          value={caseId}
          onChange={(e) => { setCaseId(e.target.value); setSelectedNode(null); }}
          aria-label="Select investigation"
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white max-w-xs"
        >
          {cases.length === 0 && <option value="">No cases</option>}
          {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {!graph || graph.nodes.length === 0 ? (
        <div className="h-96 flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
          No correlated indicators yet — add evidence to this case first.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search indicators"
              aria-label="Search indicators"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by indicator type" className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="all">All indicator types</option>
              {[...new Set(graph.nodes.map((node) => node.type))].sort().map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <button onClick={() => setZoom((value) => Math.min(2, value + 0.2))} aria-label="Zoom in" className="border border-slate-200 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">+</button>
            <button onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))} aria-label="Zoom out" className="border border-slate-200 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">−</button>
            <button onClick={resetGraph} className="border border-slate-200 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">Reset</button>
            <button onClick={exportGraph} className="border border-slate-200 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">Export JSON</button>
          </div>

          {visibleNodes.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
              No indicators match the selected search and type filter.
            </div>
          ) : (
          <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-3 min-w-0">
            <canvas
              ref={canvasRef}
              width={760}
              height={520}
              onClick={handleClick}
              className="w-full h-auto cursor-pointer"
              aria-label="Evidence relationship graph. Select a node to inspect its sources."
            />
            <div className="flex gap-4 text-xs text-slate-500 px-2 pb-1 flex-wrap">
              {Object.entries(TYPE_COLOR).map(([t, c]) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold mb-2">Node details</h3>
              {!selectedNode ? (
                <p className="text-xs text-slate-400">Click a node to inspect it.</p>
              ) : (
                <div className="text-sm space-y-1">
                  <div className="text-xs uppercase text-slate-400">{selectedNode.type}</div>
                  <div className="font-mono break-all">{selectedNode.value}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    First extracted: {selectedNode.first_seen_at ? new Date(selectedNode.first_seen_at).toLocaleString() : "Timestamp unavailable"}
                  </div>
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <div className="text-xs text-slate-400 mb-1">Source evidence</div>
                    {selectedNode.sources?.length ? selectedNode.sources.map((source) => (
                      <div key={source.evidence_id} className="text-xs text-slate-600 py-1">
                        <div className="font-medium break-all">{source.filename}</div>
                        <div className="text-slate-400">Added {new Date(source.uploaded_at).toLocaleString()}</div>
                      </div>
                    )) : <p className="text-xs text-slate-400">No source evidence is recorded for this indicator.</p>}
                  </div>
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <div className="text-xs text-slate-400 mb-1">Connected relationships</div>
                    {graph.edges
                      .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                      .map((e, i) => (
                        <div key={i} className="text-xs text-slate-600 py-1 border-b border-slate-50 last:border-0">
                          <span className="font-medium">{e.type}</span>
                          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${e.confidence === "observed" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                            {e.confidence}
                          </span>
                          <div className="text-slate-400 mt-0.5">{e.explanation}</div>
                        </div>
                      ))}
                    {graph.edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
                      <p className="text-xs text-slate-400">No direct relationships recorded.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold mb-2">Relationships ({visibleEdges.length})</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {visibleEdges.map((e, i) => (
                  <div key={i} className="text-xs border-b border-slate-50 pb-2 last:border-0">
                    <div className="font-medium">{e.type}</div>
                    <div className="text-slate-400">{e.explanation}</div>
                  </div>
                ))}
                {visibleEdges.length === 0 && <p className="text-xs text-slate-400">No direct relationships among these indicators.</p>}
              </div>
            </div>
          </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
