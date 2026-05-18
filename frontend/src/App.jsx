import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";
const NAV_ITEMS = [
  { label: "EXPLORE", sectionId: "explore" },
  { label: "PATHS", sectionId: "paths" },
  { label: "GRAPH", sectionId: "graph" },
  { label: "AI EXPLAIN", sectionId: "ai-explain" },
];
const NODE_COLORS = {
  start: "#d8b65a",
  target: "#5ab8ff",
  connected: "#f5f0e8",
  path: "#7bdcff",
};
const EXAMPLE_PAIRS = [
  { start: "Python", target: "Monty Python", depth: 1 },
  {
    start: "Python programming language",
    target: "Artificial intelligence",
    depth: 2,
  },
  { start: "Computer science", target: "Philosophy", depth: 2 },
  { start: "Mathematics", target: "Music", depth: 2 },
];
const NO_PATH_MESSAGE =
  "No path found in current graph. Try increasing depth or using exact Wikipedia title.";

const getNodeId = (node) => (typeof node === "object" ? node.id : node);

const getLinkKey = (source, target) => {
  const sourceId = getNodeId(source);
  const targetId = getNodeId(target);

  return [sourceId, targetId].sort().join("::");
};

function App() {
  const graphRef = useRef();
  const graphShellRef = useRef();
  const [startArticle, setStartArticle] = useState("Python");
  const [targetArticle, setTargetArticle] = useState("Monty Python");
  const [depth, setDepth] = useState(1);
  const [maxLinksPerPage, setMaxLinksPerPage] = useState(50);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [loading, setLoading] = useState(false);
  const [pathLoading, setPathLoading] = useState(false);
  const [shortestPath, setShortestPath] = useState([]);
  const [hasSearchedPath, setHasSearchedPath] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [graphSize, setGraphSize] = useState({ width: 900, height: 624 });

  const hasPath = shortestPath.length > 0;
  const pathNodeSet = useMemo(() => new Set(shortestPath), [shortestPath]);
  const pathEdgeSet = useMemo(() => {
    const edges = new Set();

    if (shortestPath.length === 0) {
      return edges;
    }

    for (let index = 0; index < shortestPath.length - 1; index += 1) {
      edges.add(getLinkKey(shortestPath[index], shortestPath[index + 1]));
    }

    return edges;
  }, [shortestPath]);
  const pathLength = Math.max(shortestPath.length - 1, 0);
  const pathLengthLabel = hasPath ? pathLength : "No path found";

  const getNodeType = useCallback(
    (node) => {
      if (node.id === startArticle.trim()) {
        return "start";
      }

      if (node.id === targetArticle.trim()) {
        return "target";
      }

      if (hasPath && pathNodeSet.has(node.id)) {
        return "path";
      }

      return "connected";
    },
    [hasPath, pathNodeSet, startArticle, targetArticle],
  );

  const isPathLink = useCallback(
    (link) => pathEdgeSet.has(getLinkKey(link.source, link.target)),
    [pathEdgeSet],
  );

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const applyExamplePair = (example) => {
    setStartArticle(example.start);
    setTargetArticle(example.target);
    setDepth(example.depth);
    setShortestPath([]);
    setHasSearchedPath(false);
    setStatusMessage("");
  };

  useEffect(() => {
    if (!graphShellRef.current) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setGraphSize({
        width: entry.contentRect.width,
        height: Math.max(entry.contentRect.height, 420),
      });
    });

    resizeObserver.observe(graphShellRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) {
      return;
    }

    const chargeForce = graphRef.current.d3Force("charge");
    const linkForce = graphRef.current.d3Force("link");
    const centerForce = graphRef.current.d3Force("center");

    chargeForce?.strength(-360);
    linkForce?.distance((link) => (isPathLink(link) ? 150 : 105));
    centerForce?.strength?.(0.08);
    graphRef.current.zoomToFit(500, 80);
  }, [graphData, isPathLink]);

  const buildGraph = async () => {
    setLoading(true);
    setStatusMessage("");

    try {
      await fetch(`${API_BASE}/build-graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_article: startArticle.trim(),
          depth: Number(depth),
          max_links_per_page: Number(maxLinksPerPage),
        }),
      });

      const graphResponse = await fetch(`${API_BASE}/graph`);
      const graph = await graphResponse.json();

      const formattedGraph = {
        nodes: graph.nodes,
        links: graph.edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
        })),
      };

      setGraphData(formattedGraph);

      const statsResponse = await fetch(`${API_BASE}/stats`);
      const statsData = await statsResponse.json();
      setStats(statsData);
      setShortestPath([]);
      setHasSearchedPath(false);
    } catch {
      setStatusMessage("Unable to build graph. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  };

  const findPath = async () => {
    setPathLoading(true);
    setStatusMessage("");

    try {
      const pathResponse = await fetch(`${API_BASE}/shortest-path`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: startArticle.trim(),
          target: targetArticle.trim(),
        }),
      });
      const pathData = await pathResponse.json();
      const nextPath = pathData.path ?? [];

      setShortestPath(nextPath);
      setHasSearchedPath(true);
      if (!nextPath.length) {
        setStatusMessage(pathData.message ?? NO_PATH_MESSAGE);
      }
    } catch {
      setStatusMessage("Unable to find a path. Check that the API is running.");
    } finally {
      setPathLoading(false);
    }
  };

  const paintNode = useCallback(
    (node, ctx, globalScale) => {
      const label = node.label ?? node.id;
      const isHovered = hoveredNode?.id === node.id;
      const nodeType = getNodeType(node);
      const isPathNode = nodeType === "path";
      const isStartNode = nodeType === "start";
      const isTargetNode = nodeType === "target";
      const radius = isPathNode || isStartNode || isTargetNode ? 6.8 : 4.5;
      const color = NODE_COLORS[nodeType];
      const shouldShowLabel = globalScale > 1.55 || isHovered;

      if (isPathNode || isTargetNode) {
        const glow = ctx.createRadialGradient(
          node.x,
          node.y,
          radius * 0.5,
          node.x,
          node.y,
          radius * 4.4,
        );
        glow.addColorStop(0, "rgba(123, 220, 255, 0.48)");
        glow.addColorStop(1, "rgba(123, 220, 255, 0)");
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 4.4, 0, 2 * Math.PI, false);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.shadowBlur = isPathNode || isTargetNode ? 18 : isStartNode ? 10 : 0;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (!shouldShowLabel) {
        return;
      }

      const fontSize = Math.max(10 / globalScale, 3.8);
      const textPadding = 4 / globalScale;

      ctx.font = `600 ${fontSize}px Inter, Sans-Serif`;
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = "rgba(5, 5, 5, 0.78)";
      ctx.fillRect(
        node.x + 9,
        node.y - fontSize - textPadding,
        textWidth + textPadding * 2,
        fontSize + textPadding * 2,
      );
      ctx.fillStyle = isPathNode || isTargetNode ? "#c9ecff" : "#f5f0e8";
      ctx.fillText(label, node.x + 9 + textPadding, node.y + 1);
    },
    [getNodeType, hoveredNode],
  );

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">WIKI GRAPH</div>

        <div className="nav-links">
          {NAV_ITEMS.map((item) => (
            <button
              className="nav-button"
              key={item.sectionId}
              type="button"
              onClick={() => scrollToSection(item.sectionId)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="layout">
        <section className="left-panel" id="explore">
          <p className="eyebrow">KNOWLEDGE GRAPH / WIKIPEDIA</p>

          <h1>
            Discover hidden <span>connections</span>
          </h1>

          <p className="subtitle">
            Enter a Wikipedia article, crawl internal links, build a graph, and
            explore how concepts connect through BFS and shortest paths.
          </p>

          <div className="control-card">
            <label>START ARTICLE</label>
            <input
              value={startArticle}
              onChange={(e) => setStartArticle(e.target.value)}
              placeholder="Python"
            />

            <label>TARGET ARTICLE</label>
            <input
              value={targetArticle}
              onChange={(e) => setTargetArticle(e.target.value)}
              placeholder="Monty Python"
            />

            <label>DEPTH</label>
            <input
              type="number"
              min="1"
              max="3"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
            />

            <label>MAX LINKS PER PAGE</label>
            <input
              type="number"
              min="1"
              max="500"
              value={maxLinksPerPage}
              onChange={(e) => setMaxLinksPerPage(e.target.value)}
            />

            <div className="action-row">
              <button
                className="primary-action"
                type="button"
                onClick={buildGraph}
                disabled={loading}
              >
                {loading ? "BUILDING..." : "BUILD GRAPH"}
              </button>
              <button
                className="secondary-action"
                type="button"
                onClick={findPath}
                disabled={pathLoading}
              >
                {pathLoading ? "SEARCHING..." : "FIND PATH"}
              </button>
            </div>
            <p className="status-message">
              Tip: Build the graph first, then find a path.
            </p>

            <div className="example-pairs">
              <p>EXAMPLES</p>
              {EXAMPLE_PAIRS.map((example) => (
                <button
                  className="example-pair"
                  key={`${example.start}-${example.target}`}
                  type="button"
                  onClick={() => applyExamplePair(example)}
                >
                  <span>
                    {example.start} → {example.target}
                  </span>
                  <strong>Depth {example.depth}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="stats-grid">
            <div>
              <p>NODES</p>
              <strong>{stats.nodes}</strong>
            </div>
            <div>
              <p>EDGES</p>
              <strong>{stats.edges}</strong>
            </div>
            <div>
              <p>PATH LENGTH</p>
              <strong className={hasPath ? "" : "text-value"}>
                {pathLengthLabel}
              </strong>
            </div>
          </div>

          <section className="path-panel" id="paths">
            <p className="eyebrow">SHORTEST PATH</p>
            {hasPath ? (
              <ol className="path-timeline">
                {shortestPath.map((article, index) => (
                  <li
                    className={[
                      index === 0 ? "timeline-start" : "",
                      index === shortestPath.length - 1 ? "timeline-target" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={`${article}-${index}`}
                  >
                    <span>{index + 1}</span>
                    <strong>{article}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-path">
                <strong>
                  {hasSearchedPath ? "No path found" : "Path not searched yet"}
                </strong>
                <p>
                  {hasSearchedPath
                    ? statusMessage || NO_PATH_MESSAGE
                    : "Build a graph, then find a path between the selected articles."}
                </p>
              </div>
            )}
            {statusMessage && hasPath && (
              <p className="status-message">{statusMessage}</p>
            )}
          </section>

          <section className="ai-panel" id="ai-explain">
            <p className="eyebrow">AI EXPLAIN</p>
            <h2>{targetArticle}</h2>
          </section>
        </section>

        <section className="graph-card" id="graph">
          <div className="graph-header">
            <div>
              <p className="eyebrow">LIVE GRAPH VIEW</p>
              <h2>{startArticle}</h2>
            </div>
            <span>{loading ? "CRAWLING" : "READY"}</span>
          </div>

          <div className="graph-shell" ref={graphShellRef}>
            <div className="graph-orbit" />

            <div className="graph-instructions">
              Scroll to zoom. Drag the canvas to pan. Hover a node for its
              article name.
            </div>

            <div className="graph-stats-panel">
              <div>
                <p>TOTAL NODES</p>
                <strong>{stats.nodes}</strong>
              </div>
              <div>
                <p>TOTAL EDGES</p>
                <strong>{stats.edges}</strong>
              </div>
              <div>
                <p>PATH LENGTH</p>
                <strong className={hasPath ? "" : "text-value"}>
                  {pathLengthLabel}
                </strong>
              </div>
            </div>

            <div className="graph-legend">
              <p>LEGEND</p>
              <span>
                <i className="legend-start" /> Start node
              </span>
              <span>
                <i className="legend-target" /> Target node
              </span>
              <span>
                <i className="legend-connected" /> Connected node
              </span>
              <span>
                <i className="legend-edge" /> Shortest path edge
              </span>
            </div>

            {hoveredNode && (
              <div className="graph-tooltip">
                {hoveredNode.label ?? hoveredNode.id}
              </div>
            )}

            <ForceGraph2D
              ref={graphRef}
              width={graphSize.width}
              height={graphSize.height}
              graphData={graphData}
              nodeLabel={(node) => node.label}
              onNodeHover={setHoveredNode}
              nodeCanvasObject={paintNode}
              nodePointerAreaPaint={(node, color, ctx) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, 9, 0, 2 * Math.PI, false);
                ctx.fill();
              }}
              linkColor={(link) =>
                isPathLink(link)
                  ? "rgba(123, 220, 255, 0.98)"
                  : "rgba(245, 240, 232, 0.16)"
              }
              linkWidth={(link) => (isPathLink(link) ? 2.6 : 0.65)}
              linkDirectionalParticles={(link) => (isPathLink(link) ? 5 : 0)}
              linkDirectionalParticleColor={(link) =>
                isPathLink(link)
                  ? "rgba(123, 220, 255, 0.98)"
                  : "rgba(216, 182, 90, 0.35)"
              }
              linkDirectionalParticleSpeed={(link) =>
                isPathLink(link) ? 0.009 : 0.0025
              }
              linkDirectionalParticleWidth={(link) =>
                isPathLink(link) ? 3 : 1.2
              }
              cooldownTicks={140}
              d3VelocityDecay={0.32}
              enableNodeDrag
              enablePanInteraction
              enableZoomInteraction
              backgroundColor="rgba(5, 5, 5, 0)"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
