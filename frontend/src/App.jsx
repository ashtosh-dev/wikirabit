import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { label: "EXPLORE", sectionId: "explore" },
  { label: "INSIGHTS", sectionId: "insights" },
  { label: "PATHS", sectionId: "paths" },
  { label: "GRAPH", sectionId: "graph" },
  { label: "AI EXPLAIN", sectionId: "ai-explain" },
  { label: "FILES", sectionId: "file-io" },
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

const DEFAULT_STATS = {
  nodes: 0,
  edges: 0,
  density: 0,
  average_degree: 0,
  top_hubs: [],
};

const DEFAULT_CENTRALITY = {
  articles: [],
};

const DEFAULT_CONNECTIONS = {
  article: "",
  degree: 0,
  connected_articles: [],
};

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
  const [strategy, setStrategy] = useState("bfs");

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [centrality, setCentrality] = useState(DEFAULT_CENTRALITY);
  const [connections, setConnections] = useState(DEFAULT_CONNECTIONS);

  const [loading, setLoading] = useState(false);
  const [pathLoading, setPathLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);

  const [shortestPath, setShortestPath] = useState([]);
  const [hasSearchedPath, setHasSearchedPath] = useState(false);

  const [statusMessage, setStatusMessage] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiMessage, setAiMessage] = useState("");

  const [saveFilename, setSaveFilename] = useState("wikirabit_graph");
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState("");
  const [sessionRenameDrafts, setSessionRenameDrafts] = useState({});
  const [exportFilename, setExportFilename] = useState("wikirabit_graph");
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportFiles, setExportFiles] = useState([]);
  const [connectionArticle, setConnectionArticle] = useState("Python");

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

  const resetPathAndAi = () => {
    setShortestPath([]);
    setHasSearchedPath(false);
    setAiExplanation("");
    setAiMessage("");
  };

  const resetInsightPanels = () => {
    setCentrality(DEFAULT_CENTRALITY);
    setConnections(DEFAULT_CONNECTIONS);
    setExportFiles([]);
  };

  const applyExamplePair = (example) => {
    setStartArticle(example.start);
    setTargetArticle(example.target);
    setDepth(example.depth);
    setConnectionArticle(example.start);
    resetPathAndAi();
    setStatusMessage("");
  };

  const formatGraphForFrontend = (graph) => ({
    nodes: graph.nodes ?? [],
    links: (graph.edges ?? []).map((edge) => ({
      source: edge.source,
      target: edge.target,
    })),
  });

  const fitGraphToView = useCallback((duration = 700, padding = 120) => {
    if (!graphRef.current || graphData.nodes.length === 0) {
      return;
    }

    graphRef.current.zoomToFit(duration, padding);
  }, [graphData.nodes.length]);

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`);
      const data = await response.json();

      setSessions(data.sessions ?? []);
      setCurrentSession(data.current_session ?? "");
      setSessionRenameDrafts((currentDrafts) => {
        const nextDrafts = {};

        for (const session of data.sessions ?? []) {
          nextDrafts[session.filename] =
            currentDrafts[session.filename] ?? session.filename.replace(/\.json$/i, "");
        }

        return nextDrafts;
      });
    } catch {
      setStatusMessage("Unable to load saved sessions.");
    }
  }, []);

  const loadCentrality = useCallback(async () => {
    const response = await fetch(`${API_BASE}/centrality?limit=8`);
    const data = await response.json();

    setCentrality({
      ...DEFAULT_CENTRALITY,
      ...data,
    });
  }, []);

  const loadConnections = useCallback(async (article) => {
    const normalizedArticle = article.trim();

    if (!normalizedArticle) {
      setConnections(DEFAULT_CONNECTIONS);
      return;
    }

    const response = await fetch(
      `${API_BASE}/connections?article=${encodeURIComponent(normalizedArticle)}&limit=12`,
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail ?? "Unable to load connected articles.");
    }

    setConnections({
      ...DEFAULT_CONNECTIONS,
      ...data,
    });
  }, []);

  const loadGraphSnapshot = useCallback(async () => {
    const [graphResponse, statsResponse] = await Promise.all([
      fetch(`${API_BASE}/graph`),
      fetch(`${API_BASE}/stats`),
    ]);

    const [graph, statsData] = await Promise.all([
      graphResponse.json(),
      statsResponse.json(),
    ]);

    setGraphData(formatGraphForFrontend(graph));
    setStats({
      ...DEFAULT_STATS,
      ...statsData,
    });
  }, []);

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
      return undefined;
    }

    const chargeForce = graphRef.current.d3Force("charge");
    const linkForce = graphRef.current.d3Force("link");
    const centerForce = graphRef.current.d3Force("center");

    chargeForce?.strength(-220);
    linkForce?.distance((link) => (isPathLink(link) ? 160 : 120));
    centerForce?.strength?.(0.12);

    const fitTimer = setTimeout(() => {
      fitGraphToView(900, 120);
    }, 900);

    return () => clearTimeout(fitTimer);
  }, [graphData, isPathLink, fitGraphToView]);

  useEffect(() => {
    let ignore = false;

    const hydrateSessions = async () => {
      try {
        const response = await fetch(`${API_BASE}/sessions`);
        const data = await response.json();

        if (ignore) {
          return;
        }

        setSessions(data.sessions ?? []);
        setCurrentSession(data.current_session ?? "");
        setSessionRenameDrafts((currentDrafts) => {
          const nextDrafts = {};

          for (const session of data.sessions ?? []) {
            nextDrafts[session.filename] =
              currentDrafts[session.filename] ??
              session.filename.replace(/\.json$/i, "");
          }

          return nextDrafts;
        });
      } catch {
        if (!ignore) {
          setStatusMessage("Unable to load saved sessions.");
        }
      }
    };

    hydrateSessions();

    return () => {
      ignore = true;
    };
  }, []);

  const buildGraph = async () => {
    setLoading(true);
    setStatusMessage("");
    resetPathAndAi();
    resetInsightPanels();

    try {
      const normalizedStartArticle = startArticle.trim();
      const buildResponse = await fetch(`${API_BASE}/build-graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_article: normalizedStartArticle,
          depth: Number(depth),
          max_links_per_page: Number(maxLinksPerPage),
          strategy,
        }),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json();
        throw new Error(errorData.detail ?? "Unable to build graph.");
      }

      await loadGraphSnapshot();
      await loadCentrality();
      await loadConnections(normalizedStartArticle);
      setConnectionArticle(normalizedStartArticle);
      setCurrentSession("");

      setStatusMessage("Graph built successfully.");
    } catch (error) {
      setStatusMessage(
        error.message || "Unable to build graph. Check that the API is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const findPath = async () => {
    setPathLoading(true);
    setStatusMessage("");
    setAiExplanation("");
    setAiMessage("");

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
      } else {
        setStatusMessage("Shortest path found.");
      }
    } catch {
      setStatusMessage("Unable to find a path. Check that the API is running.");
    } finally {
      setPathLoading(false);
    }
  };

  const explainPath = async () => {
    setExplainLoading(true);
    setAiMessage("");
    setAiExplanation("");

    try {
      const explainResponse = await fetch(`${API_BASE}/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: startArticle.trim(),
          target: targetArticle.trim(),
          path: shortestPath,
        }),
      });

      const explainData = await explainResponse.json();

      setAiExplanation(explainData.explanation ?? "");
      setAiMessage(explainData.message ?? "");
    } catch {
      setAiMessage(
        "Unable to generate AI explanation. Check that the API is running.",
      );
    } finally {
      setExplainLoading(false);
    }
  };

  const saveGraph = async () => {
    setStatusMessage("");

    try {
      const response = await fetch(`${API_BASE}/save-graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: saveFilename,
          target_article: targetArticle.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to save graph.");
      }

      setStatusMessage(`Graph saved as ${data.filename}`);
      setCurrentSession(data.filename ?? "");
      await loadSessions();
    } catch (error) {
      setStatusMessage(error.message || "Unable to save graph.");
    }
  };

  const loadGraph = async (filename) => {
    setStatusMessage("");

    try {
      const response = await fetch(`${API_BASE}/load-graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to load graph.");
      }

      await loadGraphSnapshot();
      await loadCentrality();

      resetPathAndAi();
      setStartArticle(data.metadata?.start_article ?? startArticle);
      setTargetArticle(data.metadata?.target_article ?? targetArticle);
      setDepth(String(data.metadata?.depth ?? depth));
      setMaxLinksPerPage(
        String(data.metadata?.max_links_per_page ?? maxLinksPerPage),
      );
      setStrategy(data.metadata?.strategy ?? strategy);
      setConnectionArticle(data.metadata?.start_article ?? connectionArticle);
      await loadConnections(data.metadata?.start_article ?? connectionArticle);
      await loadSessions();
      setStatusMessage(`Loaded ${filename}`);
    } catch (error) {
      setStatusMessage(error.message || "Unable to load graph.");
    }
  };

  const renameSession = async (filename) => {
    setStatusMessage("");

    try {
      const response = await fetch(`${API_BASE}/sessions/rename`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename,
          new_filename: sessionRenameDrafts[filename] ?? filename,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to rename session.");
      }

      setStatusMessage(`Renamed session to ${data.filename}`);
      await loadSessions();
    } catch (error) {
      setStatusMessage(error.message || "Unable to rename session.");
    }
  };

  const deleteSession = async (filename) => {
    setStatusMessage("");

    try {
      const response = await fetch(`${API_BASE}/sessions/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to delete session.");
      }

      if (currentSession === filename) {
        setCurrentSession("");
      }

      setStatusMessage(`Deleted ${data.filename}`);
      await loadSessions();
    } catch (error) {
      setStatusMessage(error.message || "Unable to delete session.");
    }
  };

  const exportGraph = async () => {
    setStatusMessage("");

    try {
      const response = await fetch(`${API_BASE}/export-graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: exportFilename,
          format: exportFormat,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to export graph.");
      }

      setExportFiles(data.files ?? []);
      setStatusMessage(
        exportFormat === "csv"
          ? "Exported node and edge CSV files."
          : "Exported GraphML file.",
      );
    } catch (error) {
      setStatusMessage(error.message || "Unable to export graph.");
    }
  };

  const downloadExport = (filename) => {
    const link = document.createElement("a");
    link.href = `${API_BASE}/exports/${encodeURIComponent(filename)}`;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
  };

  const inspectArticle = async (article) => {
    setConnectionArticle(article);

    try {
      await loadConnections(article);
    } catch (error) {
      setStatusMessage(
        error.message || "Unable to load connected articles for that node.",
      );
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
            explore how concepts connect through BFS, DFS, shortest paths, and
            AI explanations.
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
              max="4"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
            />

            <label>CRAWL STRATEGY</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              <option value="bfs">BFS - level by level</option>
              <option value="dfs">DFS - deep rabbit hole</option>
            </select>

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
                disabled={pathLoading || graphData.nodes.length === 0}
              >
                {pathLoading ? "SEARCHING..." : "FIND PATH"}
              </button>
            </div>

            <p className="status-message">
              Tip: Build the graph first, then find a path.
            </p>

            {statusMessage && (
              <p className="status-message status-highlight">
                {statusMessage}
              </p>
            )}

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

          <section className="stats-panel">
            <p className="eyebrow">PANDAS STATS</p>

            <div className="mini-stats">
              <div>
                <p>DENSITY</p>
                <strong>{stats.density ?? 0}</strong>
              </div>
              <div>
                <p>AVG DEGREE</p>
                <strong>{stats.average_degree ?? 0}</strong>
              </div>
            </div>

            {stats.top_hubs?.length > 0 && (
              <div className="top-hubs">
                <p>TOP HUB ARTICLES</p>

                {stats.top_hubs.map((hub) => (
                  <div className="hub-row" key={hub.article}>
                    <span>{hub.article}</span>
                    <strong>{hub.degree}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="insights-panel" id="insights">
            <p className="eyebrow">GRAPH INSIGHTS</p>
            <h2>Degree centrality and connected articles</h2>

            {centrality.articles?.length > 0 ? (
              <>
                <div className="top-hubs">
                  <p>TOP CENTRAL ARTICLES</p>

                  {centrality.articles.map((article) => (
                    <button
                      className="hub-row hub-action"
                      key={article.article}
                      type="button"
                      onClick={() => inspectArticle(article.article)}
                    >
                      <span>{article.article}</span>
                      <strong>{article.degree_centrality}</strong>
                    </button>
                  ))}
                </div>

                <label>CONNECTED ARTICLE LOOKUP</label>
                <input
                  value={connectionArticle}
                  onChange={(e) => setConnectionArticle(e.target.value)}
                  placeholder="Search an article from the current graph"
                />

                <div className="action-row">
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => inspectArticle(connectionArticle)}
                    disabled={graphData.nodes.length === 0}
                  >
                    SHOW CONNECTIONS
                  </button>
                </div>

                {connections.article && (
                  <div className="connections-panel">
                    <div className="connections-header">
                      <div>
                        <p>SELECTED ARTICLE</p>
                        <strong>{connections.article}</strong>
                      </div>
                      <span>{connections.degree} links</span>
                    </div>

                    {connections.connected_articles.length > 0 ? (
                      <div className="sessions-list compact-list">
                        {connections.connected_articles.map((article) => (
                          <button
                            className="session-item compact-item"
                            key={article.article}
                            type="button"
                            onClick={() => inspectArticle(article.article)}
                          >
                            <span>{article.article}</span>
                            <strong>{article.degree} degree</strong>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="status-message">
                        This article has no saved neighbors in the current graph.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="status-message">
                Build or load a graph to inspect central articles and their direct
                connections.
              </p>
            )}
          </section>

          <section className="path-panel" id="paths">
            <p className="eyebrow">SHORTEST PATH</p>

            {hasPath ? (
              <ol className="path-timeline">
                {shortestPath.map((article, index) => (
                  <li
                    className={[
                      index === 0 ? "timeline-start" : "",
                      index === shortestPath.length - 1
                        ? "timeline-target"
                        : "",
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
          </section>

          <section className="ai-panel" id="ai-explain">
            <p className="eyebrow">AI EXPLAIN</p>
            <h2>
              {startArticle} → {targetArticle}
            </h2>

            <button
              className="secondary-action explain-button"
              type="button"
              onClick={explainPath}
              disabled={explainLoading || !hasPath}
            >
              {explainLoading ? "EXPLAINING..." : "EXPLAIN CONNECTION"}
            </button>

            {!hasPath && (
              <p className="status-message">
                Find a shortest path first, then generate the AI explanation.
              </p>
            )}

            {aiMessage && <p className="status-message">{aiMessage}</p>}

            {aiExplanation && (
              <div className="ai-explanation">{aiExplanation}</div>
            )}
          </section>

          <section className="storage-panel" id="file-io">
            <p className="eyebrow">FILE I/O</p>
            <h2>Save, export, and manage sessions</h2>

            <label>SESSION NAME</label>
            <input
              value={saveFilename}
              onChange={(e) => setSaveFilename(e.target.value)}
              placeholder="wikirabit_graph"
            />

            <div className="action-row">
              <button
                className="primary-action"
                type="button"
                onClick={saveGraph}
                disabled={graphData.nodes.length === 0}
              >
                SAVE GRAPH
              </button>

              <button
                className="secondary-action"
                type="button"
                onClick={loadSessions}
              >
                REFRESH HISTORY
              </button>
            </div>

            <label>EXPORT NAME</label>
            <input
              value={exportFilename}
              onChange={(e) => setExportFilename(e.target.value)}
              placeholder="wikirabit_graph"
            />

            <label>EXPORT FORMAT</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="csv">CSV (nodes + edges)</option>
              <option value="graphml">GraphML</option>
            </select>

            <div className="action-row">
              <button
                className="secondary-action"
                type="button"
                onClick={exportGraph}
                disabled={graphData.nodes.length === 0}
              >
                EXPORT GRAPH
              </button>
            </div>

            {exportFiles.length > 0 && (
              <div className="sessions-list compact-list">
                {exportFiles.map((file) => (
                  <button
                    className="session-item compact-item"
                    key={file.filename}
                    type="button"
                    onClick={() => downloadExport(file.filename)}
                  >
                    <span>{file.filename}</span>
                    <strong>DOWNLOAD</strong>
                  </button>
                ))}
              </div>
            )}

            {sessions.length > 0 ? (
              <div className="session-history">
                <p className="history-heading">SESSION HISTORY</p>

                <div className="sessions-list">
                  {sessions.map((session) => (
                    <div
                      className={[
                        "session-card",
                        session.is_current ? "session-card-current" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={session.filename}
                    >
                      <div className="session-card-header">
                        <div>
                          <span>{session.filename}</span>
                          <strong>
                            {session.metadata?.nodes ?? 0} nodes /{" "}
                            {session.metadata?.edges ?? 0} edges
                          </strong>
                        </div>
                        {session.is_current && <em>Current</em>}
                      </div>

                      <p className="session-meta">
                        {session.metadata?.start_article ?? "Unknown start"} →{" "}
                        {session.metadata?.target_article ?? "No target saved"}
                      </p>
                      <p className="session-meta">
                        Saved {session.metadata?.saved_at ?? "unknown time"} ·{" "}
                        {(session.metadata?.strategy ?? "bfs").toUpperCase()} ·
                        Depth {session.metadata?.depth ?? 0}
                      </p>

                      <div className="action-row session-actions">
                        <button
                          className="secondary-action"
                          type="button"
                          onClick={() => loadGraph(session.filename)}
                        >
                          LOAD
                        </button>
                        <button
                          className="secondary-action danger-action"
                          type="button"
                          onClick={() => deleteSession(session.filename)}
                        >
                          DELETE
                        </button>
                      </div>

                      <div className="session-rename">
                        <input
                          value={sessionRenameDrafts[session.filename] ?? ""}
                          onChange={(e) =>
                            setSessionRenameDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [session.filename]: e.target.value,
                            }))
                          }
                          placeholder="Rename session"
                        />
                        <button
                          className="secondary-action"
                          type="button"
                          onClick={() => renameSession(session.filename)}
                        >
                          RENAME
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="status-message">
                Save a graph to start building session history.
              </p>
            )}
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
              onNodeClick={(node) => inspectArticle(node.label ?? node.id)}
              nodeCanvasObject={paintNode}
              nodePointerAreaPaint={(node, color, ctx) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, 9, 0, 2 * Math.PI, false);
                ctx.fill();
              }}
              onEngineStop={() => fitGraphToView(700, 120)}
              enablePointerInteraction
              enableNodeDrag
              enablePanInteraction
              enableZoomInteraction
              minZoom={0.15}
              maxZoom={8}
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
              cooldownTicks={180}
              d3VelocityDecay={0.28}
              backgroundColor="rgba(5, 5, 5, 0)"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;