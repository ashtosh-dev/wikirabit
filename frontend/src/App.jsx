// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import ForceGraph2D from "react-force-graph-2d";
// import "./App.css";

// const API_BASE = "http://127.0.0.1:8000";

// const NAV_ITEMS = [
//   { label: "EXPLORE", sectionId: "explore" },
//   { label: "INSIGHTS", sectionId: "insights" },
//   { label: "PATHS", sectionId: "paths" },
//   { label: "GRAPH", sectionId: "graph" },
//   { label: "AI EXPLAIN", sectionId: "ai-explain" },
//   { label: "FILES", sectionId: "file-io" },
// ];

// const NODE_COLORS = {
//   start: "#d8b65a",
//   target: "#5ab8ff",
//   connected: "#f5f0e8",
//   path: "#7bdcff",
// };

// const EXAMPLE_PAIRS = [
//   { start: "Python", target: "Monty Python", depth: 1 },
//   {
//     start: "Python programming language",
//     target: "Artificial intelligence",
//     depth: 2,
//   },
//   { start: "Computer science", target: "Philosophy", depth: 2 },
//   { start: "Mathematics", target: "Music", depth: 3 },
// ];

// const DEFAULT_STATS = {
//   nodes: 0,
//   edges: 0,
//   density: 0,
//   average_degree: 0,
//   top_hubs: [],
// };

// const DEFAULT_CENTRALITY = {
//   articles: [],
// };

// const DEFAULT_CONNECTIONS = {
//   article: "",
//   degree: 0,
//   connected_articles: [],
// };

// const NO_PATH_MESSAGE =
//   "No path found in current graph. Try increasing depth or using exact Wikipedia title.";

// const getNodeId = (node) => (typeof node === "object" ? node.id : node);

// const getLinkKey = (source, target) => {
//   const sourceId = getNodeId(source);
//   const targetId = getNodeId(target);

//   return [sourceId, targetId].sort().join("::");
// };

// function App() {
//   const graphRef = useRef();
//   const graphShellRef = useRef();

//   const [startArticle, setStartArticle] = useState("Python");
//   const [targetArticle, setTargetArticle] = useState("Monty Python");
//   const [depth, setDepth] = useState(1);
//   const [maxLinksPerPage, setMaxLinksPerPage] = useState(30);
//   const [strategy, setStrategy] = useState("bfs");

//   const [graphData, setGraphData] = useState({ nodes: [], links: [] });
//   const [stats, setStats] = useState(DEFAULT_STATS);
//   const [centrality, setCentrality] = useState(DEFAULT_CENTRALITY);
//   const [connections, setConnections] = useState(DEFAULT_CONNECTIONS);

//   const [loading, setLoading] = useState(false);
//   const [pathLoading, setPathLoading] = useState(false);
//   const [explainLoading, setExplainLoading] = useState(false);

//   const [shortestPath, setShortestPath] = useState([]);
//   const [hasSearchedPath, setHasSearchedPath] = useState(false);

//   const [statusMessage, setStatusMessage] = useState("");
//   const [aiExplanation, setAiExplanation] = useState("");
//   const [aiMessage, setAiMessage] = useState("");

//   const [saveFilename, setSaveFilename] = useState("wikirabit_graph");
//   const [sessions, setSessions] = useState([]);
//   const [currentSession, setCurrentSession] = useState("");
//   const [sessionRenameDrafts, setSessionRenameDrafts] = useState({});
//   const [exportFilename, setExportFilename] = useState("wikirabit_graph");
//   const [exportFormat, setExportFormat] = useState("csv");
//   const [exportFiles, setExportFiles] = useState([]);
//   const [connectionArticle, setConnectionArticle] = useState("Python");

//   const [hoveredNode, setHoveredNode] = useState(null);
//   const [graphSize, setGraphSize] = useState({ width: 900, height: 624 });

//   const hasPath = shortestPath.length > 0;
//   const pathNodeSet = useMemo(() => new Set(shortestPath), [shortestPath]);

//   const pathEdgeSet = useMemo(() => {
//     const edges = new Set();

//     if (shortestPath.length === 0) {
//       return edges;
//     }

//     for (let index = 0; index < shortestPath.length - 1; index += 1) {
//       edges.add(getLinkKey(shortestPath[index], shortestPath[index + 1]));
//     }

//     return edges;
//   }, [shortestPath]);

//   const pathLength = Math.max(shortestPath.length - 1, 0);
//   const pathLengthLabel = hasPath ? pathLength : "No path found";

//   const getNodeType = useCallback(
//     (node) => {
//       if (node.id === startArticle.trim()) {
//         return "start";
//       }

//       if (node.id === targetArticle.trim()) {
//         return "target";
//       }

//       if (hasPath && pathNodeSet.has(node.id)) {
//         return "path";
//       }

//       return "connected";
//     },
//     [hasPath, pathNodeSet, startArticle, targetArticle],
//   );

//   const isPathLink = useCallback(
//     (link) => pathEdgeSet.has(getLinkKey(link.source, link.target)),
//     [pathEdgeSet],
//   );

//   const scrollToSection = (sectionId) => {
//     document.getElementById(sectionId)?.scrollIntoView({
//       behavior: "smooth",
//       block: "start",
//     });
//   };

//   const resetPathAndAi = () => {
//     setShortestPath([]);
//     setHasSearchedPath(false);
//     setAiExplanation("");
//     setAiMessage("");
//   };

//   const resetInsightPanels = () => {
//     setCentrality(DEFAULT_CENTRALITY);
//     setConnections(DEFAULT_CONNECTIONS);
//     setExportFiles([]);
//   };

//   const applyExamplePair = (example) => {
//     setStartArticle(example.start);
//     setTargetArticle(example.target);
//     setDepth(example.depth);
//     setConnectionArticle(example.start);
//     setStrategy("bfs");
//     resetPathAndAi();
//     setStatusMessage("");
//   };

//   const formatGraphForFrontend = (graph) => ({
//     nodes: graph.nodes ?? [],
//     links: (graph.edges ?? []).map((edge) => ({
//       source: edge.source,
//       target: edge.target,
//     })),
//   });

//   const fitGraphToView = useCallback(
//     (duration = 700, padding = 80) => {
//       if (!graphRef.current || graphData.nodes.length === 0) {
//         return;
//       }

//       graphRef.current.zoomToFit(duration, padding);
//     },
//     [graphData.nodes.length],
//   );

//   const loadSessions = useCallback(async () => {
//     try {
//       const response = await fetch(`${API_BASE}/sessions`);
//       const data = await response.json();

//       setSessions(data.sessions ?? []);
//       setCurrentSession(data.current_session ?? "");

//       setSessionRenameDrafts((currentDrafts) => {
//         const nextDrafts = {};

//         for (const session of data.sessions ?? []) {
//           nextDrafts[session.filename] =
//             currentDrafts[session.filename] ??
//             session.filename.replace(/\.json$/i, "");
//         }

//         return nextDrafts;
//       });
//     } catch {
//       setStatusMessage("Unable to load saved sessions.");
//     }
//   }, []);

//   const loadCentrality = useCallback(async () => {
//     const response = await fetch(`${API_BASE}/centrality?limit=8`);
//     const data = await response.json();

//     setCentrality({
//       ...DEFAULT_CENTRALITY,
//       ...data,
//     });
//   }, []);

//   const loadConnections = useCallback(async (article) => {
//     const normalizedArticle = article.trim();

//     if (!normalizedArticle) {
//       setConnections(DEFAULT_CONNECTIONS);
//       return;
//     }

//     const response = await fetch(
//       `${API_BASE}/connections?article=${encodeURIComponent(
//         normalizedArticle,
//       )}&limit=12`,
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.detail ?? "Unable to load connected articles.");
//     }

//     setConnections({
//       ...DEFAULT_CONNECTIONS,
//       ...data,
//     });
//   }, []);

//   const loadGraphSnapshot = useCallback(async () => {
//     const [graphResponse, statsResponse] = await Promise.all([
//       fetch(`${API_BASE}/graph`),
//       fetch(`${API_BASE}/stats`),
//     ]);

//     const [graph, statsData] = await Promise.all([
//       graphResponse.json(),
//       statsResponse.json(),
//     ]);

//     setGraphData(formatGraphForFrontend(graph));

//     setStats({
//       ...DEFAULT_STATS,
//       ...statsData,
//     });
//   }, []);

//   useEffect(() => {
//     if (!graphShellRef.current) {
//       return undefined;
//     }

//     const resizeObserver = new ResizeObserver(([entry]) => {
//       setGraphSize({
//         width: entry.contentRect.width,
//         height: Math.max(entry.contentRect.height, 420),
//       });
//     });

//     resizeObserver.observe(graphShellRef.current);

//     return () => resizeObserver.disconnect();
//   }, []);

//   useEffect(() => {
//     if (!graphRef.current || graphData.nodes.length === 0) {
//       return undefined;
//     }

//     const chargeForce = graphRef.current.d3Force("charge");
//     const linkForce = graphRef.current.d3Force("link");
//     const centerForce = graphRef.current.d3Force("center");

//     chargeForce?.strength(-220);
//     linkForce?.distance((link) => (isPathLink(link) ? 160 : 120));
//     centerForce?.strength?.(0.12);

//     const fitTimer = setTimeout(() => {
//       fitGraphToView(900, 80);
//     }, 900);

//     return () => clearTimeout(fitTimer);
//   }, [graphData, isPathLink, fitGraphToView]);

//   useEffect(() => {
//     let ignore = false;

//     const hydrateSessions = async () => {
//       try {
//         const response = await fetch(`${API_BASE}/sessions`);
//         const data = await response.json();

//         if (ignore) {
//           return;
//         }

//         setSessions(data.sessions ?? []);
//         setCurrentSession(data.current_session ?? "");

//         setSessionRenameDrafts((currentDrafts) => {
//           const nextDrafts = {};

//           for (const session of data.sessions ?? []) {
//             nextDrafts[session.filename] =
//               currentDrafts[session.filename] ??
//               session.filename.replace(/\.json$/i, "");
//           }

//           return nextDrafts;
//         });
//       } catch {
//         if (!ignore) {
//           setStatusMessage("Unable to load saved sessions.");
//         }
//       }
//     };

//     hydrateSessions();

//     return () => {
//       ignore = true;
//     };
//   }, []);

//   const buildGraph = async () => {
//     setLoading(true);
//     setStatusMessage("");
//     resetPathAndAi();
//     resetInsightPanels();

//     try {
//       const normalizedStartArticle = startArticle.trim();

//       const buildResponse = await fetch(`${API_BASE}/build-graph`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           start_article: normalizedStartArticle,
//           target_article: targetArticle.trim(),
//           depth: Number(depth),
//           max_links_per_page: Number(maxLinksPerPage),
//           max_nodes: 1500,
//           strategy,
//         }),
//       });

//       if (!buildResponse.ok) {
//         const errorData = await buildResponse.json();
//         throw new Error(errorData.detail ?? "Unable to build graph.");
//       }

//       await loadGraphSnapshot();
//       await loadCentrality();
//       await loadConnections(normalizedStartArticle);

//       setConnectionArticle(normalizedStartArticle);
//       setCurrentSession("");
//       setStatusMessage("Graph built successfully.");
//     } catch (error) {
//       setStatusMessage(
//         error.message || "Unable to build graph. Check that the API is running.",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const findPath = async () => {
//     setPathLoading(true);
//     setStatusMessage("");
//     setAiExplanation("");
//     setAiMessage("");

//     try {
//       const pathResponse = await fetch(`${API_BASE}/shortest-path`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           source: startArticle.trim(),
//           target: targetArticle.trim(),
//         }),
//       });

//       const pathData = await pathResponse.json();
//       const nextPath = pathData.path ?? [];

//       setShortestPath(nextPath);
//       setHasSearchedPath(true);

//       if (!nextPath.length) {
//         setStatusMessage(pathData.message ?? NO_PATH_MESSAGE);
//       } else {
//         setStatusMessage("Shortest path found.");
//       }
//     } catch {
//       setStatusMessage("Unable to find a path. Check that the API is running.");
//     } finally {
//       setPathLoading(false);
//     }
//   };

//   const explainPath = async () => {
//     setExplainLoading(true);
//     setAiMessage("");
//     setAiExplanation("");

//     try {
//       const explainResponse = await fetch(`${API_BASE}/explain`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           source: startArticle.trim(),
//           target: targetArticle.trim(),
//           path: shortestPath,
//         }),
//       });

//       const explainData = await explainResponse.json();

//       setAiExplanation(explainData.explanation ?? "");
//       setAiMessage(explainData.message ?? "");
//     } catch {
//       setAiMessage(
//         "Unable to generate AI explanation. Check that the API is running.",
//       );
//     } finally {
//       setExplainLoading(false);
//     }
//   };

//   const saveGraph = async () => {
//     setStatusMessage("");

//     try {
//       const response = await fetch(`${API_BASE}/save-graph`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           filename: saveFilename,
//           target_article: targetArticle.trim(),
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.detail ?? "Unable to save graph.");
//       }

//       setStatusMessage(`Graph saved as ${data.filename}`);
//       setCurrentSession(data.filename ?? "");
//       await loadSessions();
//     } catch (error) {
//       setStatusMessage(error.message || "Unable to save graph.");
//     }
//   };

//   const loadGraph = async (filename) => {
//     setStatusMessage("");

//     try {
//       const response = await fetch(`${API_BASE}/load-graph`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           filename,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.detail ?? "Unable to load graph.");
//       }

//       await loadGraphSnapshot();
//       await loadCentrality();

//       resetPathAndAi();

//       setStartArticle(data.metadata?.start_article ?? startArticle);
//       setTargetArticle(data.metadata?.target_article ?? targetArticle);
//       setDepth(String(data.metadata?.depth ?? depth));
//       setMaxLinksPerPage(
//         String(data.metadata?.max_links_per_page ?? maxLinksPerPage),
//       );
//       setStrategy(data.metadata?.strategy ?? strategy);
//       setConnectionArticle(data.metadata?.start_article ?? connectionArticle);

//       await loadConnections(data.metadata?.start_article ?? connectionArticle);
//       await loadSessions();

//       setStatusMessage(`Loaded ${filename}`);
//     } catch (error) {
//       setStatusMessage(error.message || "Unable to load graph.");
//     }
//   };

//   const renameSession = async (filename) => {
//     setStatusMessage("");

//     try {
//       const response = await fetch(`${API_BASE}/sessions/rename`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           filename,
//           new_filename: sessionRenameDrafts[filename] ?? filename,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.detail ?? "Unable to rename session.");
//       }

//       setStatusMessage(`Renamed session to ${data.filename}`);
//       await loadSessions();
//     } catch (error) {
//       setStatusMessage(error.message || "Unable to rename session.");
//     }
//   };

//   const deleteSession = async (filename) => {
//     setStatusMessage("");

//     try {
//       const response = await fetch(
//         `${API_BASE}/sessions/${encodeURIComponent(filename)}`,
//         {
//           method: "DELETE",
//         },
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.detail ?? "Unable to delete session.");
//       }

//       if (currentSession === filename) {
//         setCurrentSession("");
//       }

//       setStatusMessage(`Deleted ${data.filename}`);
//       await loadSessions();
//     } catch (error) {
//       setStatusMessage(error.message || "Unable to delete session.");
//     }
//   };

//   const exportGraph = async () => {
//     setStatusMessage("");

//     try {
//       const response = await fetch(`${API_BASE}/export-graph`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           filename: exportFilename,
//           format: exportFormat,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.detail ?? "Unable to export graph.");
//       }

//       setExportFiles(data.files ?? []);

//       setStatusMessage(
//         exportFormat === "csv"
//           ? "Exported node and edge CSV files."
//           : "Exported GraphML file.",
//       );
//     } catch (error) {
//       setStatusMessage(error.message || "Unable to export graph.");
//     }
//   };

//   const downloadExport = (filename) => {
//     const link = document.createElement("a");
//     link.href = `${API_BASE}/exports/${encodeURIComponent(filename)}`;
//     link.target = "_blank";
//     link.rel = "noreferrer";
//     link.click();
//   };

//   const inspectArticle = async (article) => {
//     setConnectionArticle(article);

//     try {
//       await loadConnections(article);
//     } catch (error) {
//       setStatusMessage(
//         error.message || "Unable to load connected articles for that node.",
//       );
//     }
//   };

//   const paintNode = useCallback(
//     (node, ctx, globalScale) => {
//       if (typeof node.x !== "number" || typeof node.y !== "number") {
//         return;
//       }

//       const label = node.label ?? node.id;
//       const isHovered = hoveredNode?.id === node.id;
//       const nodeType = getNodeType(node);
//       const isPathNode = nodeType === "path";
//       const isStartNode = nodeType === "start";
//       const isTargetNode = nodeType === "target";
//       const radius = isPathNode || isStartNode || isTargetNode ? 6.8 : 4.5;
//       const color = NODE_COLORS[nodeType];
//       const shouldShowLabel = globalScale > 1.55 || isHovered;

//       if (isPathNode || isTargetNode) {
//         const glow = ctx.createRadialGradient(
//           node.x,
//           node.y,
//           radius * 0.5,
//           node.x,
//           node.y,
//           radius * 4.4,
//         );

//         glow.addColorStop(0, "rgba(123, 220, 255, 0.48)");
//         glow.addColorStop(1, "rgba(123, 220, 255, 0)");

//         ctx.beginPath();
//         ctx.arc(node.x, node.y, radius * 4.4, 0, 2 * Math.PI, false);
//         ctx.fillStyle = glow;
//         ctx.fill();
//       }

//       ctx.beginPath();
//       ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
//       ctx.fillStyle = color;
//       ctx.shadowBlur = isPathNode || isTargetNode ? 18 : isStartNode ? 10 : 0;
//       ctx.shadowColor = color;
//       ctx.fill();
//       ctx.shadowBlur = 0;

//       if (!shouldShowLabel) {
//         return;
//       }

//       const fontSize = Math.max(10 / globalScale, 3.8);
//       const textPadding = 4 / globalScale;

//       ctx.font = `600 ${fontSize}px Inter, Sans-Serif`;
//       const textWidth = ctx.measureText(label).width;

//       ctx.fillStyle = "rgba(5, 5, 5, 0.78)";
//       ctx.fillRect(
//         node.x + 9,
//         node.y - fontSize - textPadding,
//         textWidth + textPadding * 2,
//         fontSize + textPadding * 2,
//       );

//       ctx.fillStyle = isPathNode || isTargetNode ? "#c9ecff" : "#f5f0e8";
//       ctx.fillText(label, node.x + 9 + textPadding, node.y + 1);
//     },
//     [getNodeType, hoveredNode],
//   );

//   return (
//     <div className="app">
//       <nav className="navbar">
//         <div className="logo">WIKI GRAPH</div>

//         <div className="nav-links">
//           {NAV_ITEMS.map((item) => (
//             <button
//               className="nav-button"
//               key={item.sectionId}
//               type="button"
//               onClick={() => scrollToSection(item.sectionId)}
//             >
//               {item.label}
//             </button>
//           ))}
//         </div>
//       </nav>

//       <main className="layout">
//         <section className="left-panel" id="explore">
//           <p className="eyebrow">KNOWLEDGE GRAPH / WIKIPEDIA</p>

//           <h1>
//             Discover hidden <span>connections</span>
//           </h1>

//           <p className="subtitle">
//             Enter a Wikipedia article, crawl internal links, build a graph, and
//             explore how concepts connect through BFS, DFS, shortest paths, and
//             AI explanations.
//           </p>

//           <div className="control-card">
//             <label>START ARTICLE</label>
//             <input
//               value={startArticle}
//               onChange={(e) => setStartArticle(e.target.value)}
//               placeholder="Python"
//             />

//             <label>TARGET ARTICLE</label>
//             <input
//               value={targetArticle}
//               onChange={(e) => setTargetArticle(e.target.value)}
//               placeholder="Monty Python"
//             />

//             <label>DEPTH</label>
//             <input
//               type="number"
//               min="1"
//               max="5"
//               value={depth}
//               onChange={(e) => setDepth(e.target.value)}
//             />

//             <label>CRAWL STRATEGY</label>
//             <select
//               value={strategy}
//               onChange={(e) => setStrategy(e.target.value)}
//             >
//               <option value="bfs">BFS - level by level</option>
//               <option value="bidirectional">
//                 Bidirectional BFS - meet in middle
//               </option>
//               <option value="dfs">DFS - deep rabbit hole</option>
//             </select>

//             <label>MAX LINKS PER PAGE</label>
//             <input
//               type="number"
//               min="1"
//               max="100"
//               value={maxLinksPerPage}
//               onChange={(e) => setMaxLinksPerPage(e.target.value)}
//             />

//             <div className="action-row">
//               <button
//                 className="primary-action"
//                 type="button"
//                 onClick={buildGraph}
//                 disabled={loading}
//               >
//                 {loading ? "BUILDING..." : "BUILD GRAPH"}
//               </button>

//               <button
//                 className="secondary-action"
//                 type="button"
//                 onClick={findPath}
//                 disabled={pathLoading || graphData.nodes.length === 0}
//               >
//                 {pathLoading ? "SEARCHING..." : "FIND PATH"}
//               </button>
//             </div>

//             <p className="status-message">
//               Tip: Build the graph first, then find a path.
//             </p>

//             {statusMessage && (
//               <p className="status-message status-highlight">
//                 {statusMessage}
//               </p>
//             )}

//             <div className="example-pairs">
//               <p>EXAMPLES</p>

//               {EXAMPLE_PAIRS.map((example) => (
//                 <button
//                   className="example-pair"
//                   key={`${example.start}-${example.target}`}
//                   type="button"
//                   onClick={() => applyExamplePair(example)}
//                 >
//                   <span>
//                     {example.start} → {example.target}
//                   </span>
//                   <strong>Depth {example.depth}</strong>
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div className="stats-grid">
//             <div>
//               <p>NODES</p>
//               <strong>{stats.nodes}</strong>
//             </div>

//             <div>
//               <p>EDGES</p>
//               <strong>{stats.edges}</strong>
//             </div>

//             <div>
//               <p>PATH LENGTH</p>
//               <strong className={hasPath ? "" : "text-value"}>
//                 {pathLengthLabel}
//               </strong>
//             </div>
//           </div>

//           <section className="stats-panel">
//             <p className="eyebrow">PANDAS STATS</p>

//             <div className="mini-stats">
//               <div>
//                 <p>DENSITY</p>
//                 <strong>{stats.density ?? 0}</strong>
//               </div>

//               <div>
//                 <p>AVG DEGREE</p>
//                 <strong>{stats.average_degree ?? 0}</strong>
//               </div>
//             </div>

//             {stats.top_hubs?.length > 0 && (
//               <div className="top-hubs">
//                 <p>TOP HUB ARTICLES</p>

//                 {stats.top_hubs.map((hub) => (
//                   <div className="hub-row" key={hub.article}>
//                     <span>{hub.article}</span>
//                     <strong>{hub.degree}</strong>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </section>

//           <section className="insights-panel" id="insights">
//             <p className="eyebrow">GRAPH INSIGHTS</p>
//             <h2>Degree centrality and connected articles</h2>

//             {centrality.articles?.length > 0 ? (
//               <>
//                 <div className="top-hubs">
//                   <p>TOP CENTRAL ARTICLES</p>

//                   {centrality.articles.map((article) => (
//                     <button
//                       className="hub-row hub-action"
//                       key={article.article}
//                       type="button"
//                       onClick={() => inspectArticle(article.article)}
//                     >
//                       <span>{article.article}</span>
//                       <strong>{article.degree_centrality}</strong>
//                     </button>
//                   ))}
//                 </div>

//                 <label>CONNECTED ARTICLE LOOKUP</label>
//                 <input
//                   value={connectionArticle}
//                   onChange={(e) => setConnectionArticle(e.target.value)}
//                   placeholder="Search an article from the current graph"
//                 />

//                 <div className="action-row">
//                   <button
//                     className="secondary-action"
//                     type="button"
//                     onClick={() => inspectArticle(connectionArticle)}
//                     disabled={graphData.nodes.length === 0}
//                   >
//                     SHOW CONNECTIONS
//                   </button>
//                 </div>

//                 {connections.article && (
//                   <div className="connections-panel">
//                     <div className="connections-header">
//                       <div>
//                         <p>SELECTED ARTICLE</p>
//                         <strong>{connections.article}</strong>
//                       </div>

//                       <span>{connections.degree} links</span>
//                     </div>

//                     {connections.connected_articles.length > 0 ? (
//                       <div className="sessions-list compact-list">
//                         {connections.connected_articles.map((article) => (
//                           <button
//                             className="session-item compact-item"
//                             key={article.article}
//                             type="button"
//                             onClick={() => inspectArticle(article.article)}
//                           >
//                             <span>{article.article}</span>
//                             <strong>{article.degree} degree</strong>
//                           </button>
//                         ))}
//                       </div>
//                     ) : (
//                       <p className="status-message">
//                         This article has no saved neighbors in the current graph.
//                       </p>
//                     )}
//                   </div>
//                 )}
//               </>
//             ) : (
//               <p className="status-message">
//                 Build or load a graph to inspect central articles and their
//                 direct connections.
//               </p>
//             )}
//           </section>

//           <section className="path-panel" id="paths">
//             <p className="eyebrow">SHORTEST PATH</p>

//             {hasPath ? (
//               <ol className="path-timeline">
//                 {shortestPath.map((article, index) => (
//                   <li
//                     className={[
//                       index === 0 ? "timeline-start" : "",
//                       index === shortestPath.length - 1
//                         ? "timeline-target"
//                         : "",
//                     ]
//                       .filter(Boolean)
//                       .join(" ")}
//                     key={`${article}-${index}`}
//                   >
//                     <span>{index + 1}</span>
//                     <strong>{article}</strong>
//                   </li>
//                 ))}
//               </ol>
//             ) : (
//               <div className="empty-path">
//                 <strong>
//                   {hasSearchedPath ? "No path found" : "Path not searched yet"}
//                 </strong>

//                 <p>
//                   {hasSearchedPath
//                     ? statusMessage || NO_PATH_MESSAGE
//                     : "Build a graph, then find a path between the selected articles."}
//                 </p>
//               </div>
//             )}
//           </section>

//           <section className="ai-panel" id="ai-explain">
//             <p className="eyebrow">AI EXPLAIN</p>

//             <h2>
//               {startArticle} → {targetArticle}
//             </h2>

//             <button
//               className="secondary-action explain-button"
//               type="button"
//               onClick={explainPath}
//               disabled={explainLoading || !hasPath}
//             >
//               {explainLoading ? "EXPLAINING..." : "EXPLAIN CONNECTION"}
//             </button>

//             {!hasPath && (
//               <p className="status-message">
//                 Find a shortest path first, then generate the AI explanation.
//               </p>
//             )}

//             {aiMessage && <p className="status-message">{aiMessage}</p>}

//             {aiExplanation && (
//               <div className="ai-explanation">{aiExplanation}</div>
//             )}
//           </section>

//           <section className="storage-panel" id="file-io">
//             <p className="eyebrow">FILE I/O</p>
//             <h2>Save, export, and manage sessions</h2>

//             <label>SESSION NAME</label>
//             <input
//               value={saveFilename}
//               onChange={(e) => setSaveFilename(e.target.value)}
//               placeholder="wikirabit_graph"
//             />

//             <div className="action-row">
//               <button
//                 className="primary-action"
//                 type="button"
//                 onClick={saveGraph}
//                 disabled={graphData.nodes.length === 0}
//               >
//                 SAVE GRAPH
//               </button>

//               <button
//                 className="secondary-action"
//                 type="button"
//                 onClick={loadSessions}
//               >
//                 REFRESH HISTORY
//               </button>
//             </div>

//             <label>EXPORT NAME</label>
//             <input
//               value={exportFilename}
//               onChange={(e) => setExportFilename(e.target.value)}
//               placeholder="wikirabit_graph"
//             />

//             <label>EXPORT FORMAT</label>
//             <select
//               value={exportFormat}
//               onChange={(e) => setExportFormat(e.target.value)}
//             >
//               <option value="csv">CSV (nodes + edges)</option>
//               <option value="graphml">GraphML</option>
//             </select>

//             <div className="action-row">
//               <button
//                 className="secondary-action"
//                 type="button"
//                 onClick={exportGraph}
//                 disabled={graphData.nodes.length === 0}
//               >
//                 EXPORT GRAPH
//               </button>
//             </div>

//             {exportFiles.length > 0 && (
//               <div className="sessions-list compact-list">
//                 {exportFiles.map((file) => (
//                   <button
//                     className="session-item compact-item"
//                     key={file.filename}
//                     type="button"
//                     onClick={() => downloadExport(file.filename)}
//                   >
//                     <span>{file.filename}</span>
//                     <strong>DOWNLOAD</strong>
//                   </button>
//                 ))}
//               </div>
//             )}

//             {sessions.length > 0 ? (
//               <div className="session-history">
//                 <p className="history-heading">SESSION HISTORY</p>

//                 <div className="sessions-list">
//                   {sessions.map((session) => (
//                     <div
//                       className={[
//                         "session-card",
//                         session.is_current ? "session-card-current" : "",
//                       ]
//                         .filter(Boolean)
//                         .join(" ")}
//                       key={session.filename}
//                     >
//                       <div className="session-card-header">
//                         <div>
//                           <span>{session.filename}</span>
//                           <strong>
//                             {session.metadata?.nodes ?? 0} nodes /{" "}
//                             {session.metadata?.edges ?? 0} edges
//                           </strong>
//                         </div>

//                         {session.is_current && <em>Current</em>}
//                       </div>

//                       <p className="session-meta">
//                         {session.metadata?.start_article ?? "Unknown start"} →{" "}
//                         {session.metadata?.target_article ?? "No target saved"}
//                       </p>

//                       <p className="session-meta">
//                         Saved {session.metadata?.saved_at ?? "unknown time"} ·{" "}
//                         {(session.metadata?.strategy ?? "bfs").toUpperCase()} ·
//                         Depth {session.metadata?.depth ?? 0}
//                       </p>

//                       <div className="action-row session-actions">
//                         <button
//                           className="secondary-action"
//                           type="button"
//                           onClick={() => loadGraph(session.filename)}
//                         >
//                           LOAD
//                         </button>

//                         <button
//                           className="secondary-action danger-action"
//                           type="button"
//                           onClick={() => deleteSession(session.filename)}
//                         >
//                           DELETE
//                         </button>
//                       </div>

//                       <div className="session-rename">
//                         <input
//                           value={sessionRenameDrafts[session.filename] ?? ""}
//                           onChange={(e) =>
//                             setSessionRenameDrafts((currentDrafts) => ({
//                               ...currentDrafts,
//                               [session.filename]: e.target.value,
//                             }))
//                           }
//                           placeholder="Rename session"
//                         />

//                         <button
//                           className="secondary-action"
//                           type="button"
//                           onClick={() => renameSession(session.filename)}
//                         >
//                           RENAME
//                         </button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ) : (
//               <p className="status-message">
//                 Save a graph to start building session history.
//               </p>
//             )}
//           </section>
//         </section>

//         <section className="graph-card" id="graph">
//           <div className="graph-header">
//             <div>
//               <p className="eyebrow">LIVE GRAPH VIEW</p>
//               <h2>{startArticle}</h2>
//             </div>

//             <span>{loading ? "CRAWLING" : "READY"}</span>
//           </div>

//           <div className="graph-shell" ref={graphShellRef}>
//             <div className="graph-orbit" />

//             <div className="graph-instructions">
//               Scroll to zoom. Drag the canvas to pan. Hover a node for its
//               article name.
//             </div>

//             <div className="graph-stats-panel">
//               <div>
//                 <p>TOTAL NODES</p>
//                 <strong>{stats.nodes}</strong>
//               </div>

//               <div>
//                 <p>TOTAL EDGES</p>
//                 <strong>{stats.edges}</strong>
//               </div>

//               <div>
//                 <p>PATH LENGTH</p>
//                 <strong className={hasPath ? "" : "text-value"}>
//                   {pathLengthLabel}
//                 </strong>
//               </div>
//             </div>

//             <div className="graph-legend">
//               <p>LEGEND</p>

//               <span>
//                 <i className="legend-start" /> Start node
//               </span>

//               <span>
//                 <i className="legend-target" /> Target node
//               </span>

//               <span>
//                 <i className="legend-connected" /> Connected node
//               </span>

//               <span>
//                 <i className="legend-edge" /> Shortest path edge
//               </span>
//             </div>

//             {hoveredNode && (
//               <div className="graph-tooltip">
//                 {hoveredNode.label ?? hoveredNode.id}
//               </div>
//             )}

//             <ForceGraph2D
//               ref={graphRef}
//               width={graphSize.width}
//               height={graphSize.height}
//               graphData={graphData}
//               nodeLabel={(node) => node.label}
//               onNodeHover={setHoveredNode}
//               onNodeClick={(node) => inspectArticle(node.label ?? node.id)}
//               nodeCanvasObject={paintNode}
//               nodePointerAreaPaint={(node, color, ctx) => {
//                 ctx.fillStyle = color;
//                 ctx.beginPath();
//                 ctx.arc(node.x, node.y, 9, 0, 2 * Math.PI, false);
//                 ctx.fill();
//               }}
//               onEngineStop={() => fitGraphToView(700, 80)}
//               enablePointerInteraction
//               enableNodeDrag
//               enablePanInteraction
//               enableZoomInteraction
//               minZoom={0.15}
//               maxZoom={8}
//               linkColor={(link) =>
//                 isPathLink(link)
//                   ? "rgba(123, 220, 255, 0.98)"
//                   : "rgba(245, 240, 232, 0.16)"
//               }
//               linkWidth={(link) => (isPathLink(link) ? 2.6 : 0.65)}
//               linkDirectionalParticles={(link) => (isPathLink(link) ? 5 : 0)}
//               linkDirectionalParticleColor={(link) =>
//                 isPathLink(link)
//                   ? "rgba(123, 220, 255, 0.98)"
//                   : "rgba(216, 182, 90, 0.35)"
//               }
//               linkDirectionalParticleSpeed={(link) =>
//                 isPathLink(link) ? 0.009 : 0.0025
//               }
//               linkDirectionalParticleWidth={(link) =>
//                 isPathLink(link) ? 3 : 1.2
//               }
//               cooldownTicks={80}
//               d3VelocityDecay={0.28}
//               backgroundColor="rgba(5, 5, 5, 0)"
//             />
//           </div>
//         </section>
//       </main>
//     </div>
//   );
// }

// export default App;











import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  Maximize2,
  MousePointer2,
  Network,
  RotateCcw,
  Route,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Timer,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

const SAMPLE_PATH = ["Mathematics", "Logic", "Sound", "Music theory", "Music"];

const SAMPLE_GRAPH = {
  nodes: [
    { id: "Mathematics", label: "Mathematics", fx: -340, fy: 5 },
    { id: "Logic", label: "Logic", fx: -190, fy: -35 },
    { id: "Sound", label: "Sound", fx: -35, fy: 15 },
    { id: "Music theory", label: "Music theory", fx: 135, fy: 25 },
    { id: "Music", label: "Music", fx: 315, fy: -5 },
    { id: "Set theory", label: "Set theory", fx: -310, fy: -150 },
    { id: "Geometry", label: "Geometry", fx: -250, fy: 145 },
    { id: "Statistics", label: "Statistics", fx: -160, fy: 260 },
    { id: "Algebra", label: "Algebra", fx: -75, fy: 165 },
    { id: "Pythagorean theorem", label: "Pythagorean\ntheorem", fx: 60, fy: 255 },
    { id: "Philosophy", label: "Philosophy", fx: 20, fy: -255 },
    { id: "Physics", label: "Physics", fx: 35, fy: -120 },
    { id: "Acoustics", label: "Acoustics", fx: 150, fy: -145 },
    { id: "Composition", label: "Composition", fx: 430, fy: -105 },
    { id: "Art", label: "Art", fx: 380, fy: 160 },
    { id: "Culture", label: "Culture", fx: 265, fy: 250 },
  ],
  links: [
    { source: "Mathematics", target: "Logic" },
    { source: "Logic", target: "Sound" },
    { source: "Sound", target: "Music theory" },
    { source: "Music theory", target: "Music" },
    { source: "Mathematics", target: "Set theory" },
    { source: "Mathematics", target: "Geometry" },
    { source: "Mathematics", target: "Statistics" },
    { source: "Logic", target: "Algebra" },
    { source: "Logic", target: "Philosophy" },
    { source: "Logic", target: "Physics" },
    { source: "Sound", target: "Physics" },
    { source: "Sound", target: "Acoustics" },
    { source: "Sound", target: "Algebra" },
    { source: "Algebra", target: "Pythagorean theorem" },
    { source: "Physics", target: "Acoustics" },
    { source: "Acoustics", target: "Music" },
    { source: "Music theory", target: "Art" },
    { source: "Music", target: "Culture" },
    { source: "Music", target: "Composition" },
    { source: "Art", target: "Culture" },
  ],
};

const NODE_COLORS = {
  start: "#ffd24a",
  target: "#31a8ff",
  path: "#ffd24a",
  connected: "#aeb6c2",
};

const EXAMPLES = [
  { start: "Mathematics", target: "Music", depth: 5, strategy: "bfs" },
  { start: "Python", target: "Monty Python", depth: 2, strategy: "bfs" },
  {
    start: "Computer science",
    target: "Philosophy",
    depth: 3,
    strategy: "bidirectional",
  },
];

const normalizeKey = (value) => String(value ?? "").trim().toLowerCase();

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const getNodeId = (node) => {
  if (typeof node === "object" && node !== null) {
    return node.id ?? node.label ?? node.title ?? node.name;
  }

  return node;
};

const getLinkKey = (source, target) => {
  const sourceId = normalizeKey(getNodeId(source));
  const targetId = normalizeKey(getNodeId(target));
  return [sourceId, targetId].sort().join("::");
};

const normalizeNode = (node) => {
  if (typeof node === "string") {
    return { id: node, label: node };
  }

  const id = node.id ?? node.label ?? node.title ?? node.name;

  return {
    ...node,
    id: String(id),
    label: String(node.label ?? node.title ?? node.name ?? id),
  };
};

const normalizeGraph = (graph) => {
  const nodes = (graph.nodes ?? []).map(normalizeNode);

  const links = (graph.edges ?? graph.links ?? [])
    .map((edge) => {
      if (Array.isArray(edge)) {
        return {
          source: edge[0],
          target: edge[1],
        };
      }

      return {
        source: getNodeId(edge.source),
        target: getNodeId(edge.target),
      };
    })
    .filter((edge) => edge.source && edge.target);

  return { nodes, links };
};

const coerceStats = (stats, graph) => ({
  nodes: stats.nodes ?? stats.node_count ?? graph.nodes.length,
  edges: stats.edges ?? stats.edge_count ?? graph.links.length,
  density: stats.density ?? 0,
  average_degree: stats.average_degree ?? stats.avg_degree ?? 0,
});

const getJsonError = async (response, fallback) => {
  try {
    const data = await response.json();
    return data.detail ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const graphRef = useRef(null);
  const graphShellRef = useRef(null);

  const [startArticle, setStartArticle] = useState("Mathematics");
  const [targetArticle, setTargetArticle] = useState("Music");
  const [depth, setDepth] = useState(5);
  const [strategy, setStrategy] = useState("bfs");
  const [maxLinksPerPage, setMaxLinksPerPage] = useState(50);

  const [graphData, setGraphData] = useState(SAMPLE_GRAPH);
  const [stats, setStats] = useState({
    nodes: 72,
    edges: 71,
    density: 0,
    average_degree: 0,
  });

  const [shortestPath, setShortestPath] = useState(SAMPLE_PATH);
  const [hasSearchedPath, setHasSearchedPath] = useState(true);
  const [statusMessage, setStatusMessage] = useState(
    "Connection found! Path length: 4",
  );

  const [loading, setLoading] = useState(false);
  const [pathLoading, setPathLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");

  const [hoveredNode, setHoveredNode] = useState(null);
  const [graphSize, setGraphSize] = useState({ width: 1000, height: 640 });
  const [searchTime, setSearchTime] = useState("1.24s");

  const hasPath = shortestPath.length > 0;
  const pathLength = hasPath ? shortestPath.length - 1 : 0;

  const pathNodeSet = useMemo(
    () => new Set(shortestPath.map(normalizeKey)),
    [shortestPath],
  );

  const pathEdgeSet = useMemo(() => {
    const edges = new Set();

    for (let index = 0; index < shortestPath.length - 1; index += 1) {
      edges.add(getLinkKey(shortestPath[index], shortestPath[index + 1]));
    }

    return edges;
  }, [shortestPath]);

  const getNodeType = useCallback(
    (node) => {
      const nodeKey = normalizeKey(node.id);

      if (nodeKey === normalizeKey(startArticle)) return "start";
      if (nodeKey === normalizeKey(targetArticle)) return "target";
      if (pathNodeSet.has(nodeKey)) return "path";

      return "connected";
    },
    [pathNodeSet, startArticle, targetArticle],
  );

  const isPathLink = useCallback(
    (link) => pathEdgeSet.has(getLinkKey(link.source, link.target)),
    [pathEdgeSet],
  );

  const resetResultState = () => {
    setShortestPath([]);
    setHasSearchedPath(false);
    setStatusMessage("");
    setAiExplanation("");
  };

  const handleStartChange = (value) => {
    setStartArticle(value);
    resetResultState();
  };

  const handleTargetChange = (value) => {
    setTargetArticle(value);
    resetResultState();
  };

  const fitGraphToView = useCallback((duration = 700, padding = 120) => {
    graphRef.current?.zoomToFit(duration, padding);
  }, []);

  const zoomGraph = (factor) => {
    const currentZoom = graphRef.current?.zoom() ?? 1;
    graphRef.current?.zoom(currentZoom * factor, 350);
  };

  const resetGraphCamera = () => {
    graphRef.current?.centerAt(0, 0, 450);
    graphRef.current?.zoom(1, 450);
    setTimeout(() => fitGraphToView(500, 120), 100);
  };

  const loadGraphSnapshot = useCallback(async () => {
    const [graphResponse, statsResponse] = await Promise.all([
      fetch(`${API_BASE}/graph`),
      fetch(`${API_BASE}/stats`),
    ]);

    if (!graphResponse.ok) {
      throw new Error("Unable to load graph from backend.");
    }

    const graphJson = await graphResponse.json();
    const nextGraph = normalizeGraph(graphJson);

    let nextStats = {
      nodes: nextGraph.nodes.length,
      edges: nextGraph.links.length,
    };

    if (statsResponse.ok) {
      const statsJson = await statsResponse.json();
      nextStats = coerceStats(statsJson, nextGraph);
    }

    setGraphData(nextGraph);
    setStats(nextStats);
  }, []);

  const runShortestPath = useCallback(async () => {
    const response = await fetch(`${API_BASE}/shortest-path`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: startArticle.trim(),
        target: targetArticle.trim(),
      }),
    });

    if (!response.ok) {
      const message = await getJsonError(response, "Unable to find path.");
      throw new Error(message);
    }

    const data = await response.json();
    const nextPath = data.path ?? data.shortest_path ?? [];

    setShortestPath(nextPath);
    setHasSearchedPath(true);

    if (nextPath.length > 0) {
      setStatusMessage(`Connection found! Path length: ${nextPath.length - 1}`);
    } else {
      setStatusMessage(
        data.message ??
          "No path found in the current graph. Try increasing depth.",
      );
    }
  }, [startArticle, targetArticle]);

  const findConnection = async () => {
    const startedAt = performance.now();

    setLoading(true);
    setPathLoading(true);
    setAiExplanation("");
    setStatusMessage("Building graph and searching connection...");

    try {
      const response = await fetch(`${API_BASE}/build-graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_article: startArticle.trim(),
          target_article: targetArticle.trim(),
          depth: Number(depth),
          max_links_per_page: Number(maxLinksPerPage),
          max_nodes: 1500,
          strategy,
        }),
      });

      if (!response.ok) {
        const message = await getJsonError(response, "Unable to build graph.");
        throw new Error(message);
      }

      await loadGraphSnapshot();
      await runShortestPath();

      const seconds = ((performance.now() - startedAt) / 1000).toFixed(2);
      setSearchTime(`${seconds}s`);
      setTimeout(() => fitGraphToView(900, 120), 250);
    } catch (error) {
      setHasSearchedPath(true);
      setShortestPath([]);
      setStatusMessage(
        error.message ||
          "Could not complete the search. Check whether the backend is running.",
      );
    } finally {
      setLoading(false);
      setPathLoading(false);
    }
  };

  const pathOnly = async () => {
    const startedAt = performance.now();

    setPathLoading(true);
    setAiExplanation("");
    setStatusMessage("Searching shortest path...");

    try {
      await runShortestPath();

      const seconds = ((performance.now() - startedAt) / 1000).toFixed(2);
      setSearchTime(`${seconds}s`);
    } catch (error) {
      setHasSearchedPath(true);
      setShortestPath([]);
      setStatusMessage(
        error.message || "Unable to find path. Build the graph first.",
      );
    } finally {
      setPathLoading(false);
    }
  };

  const explainPath = async () => {
    if (!hasPath) return;

    setAiLoading(true);
    setAiExplanation("");

    try {
      const response = await fetch(`${API_BASE}/explain`, {
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

      if (!response.ok) {
        const message = await getJsonError(response, "Unable to explain path.");
        throw new Error(message);
      }

      const data = await response.json();
      setAiExplanation(
        data.explanation ??
          data.message ??
          "No explanation returned by the backend.",
      );
    } catch (error) {
      setAiExplanation(
        error.message ||
          "AI explanation failed. Check your backend and Gemini key.",
      );
    } finally {
      setAiLoading(false);
    }
  };
  const closeDetails = () => {
  setAiExplanation("");
};

  const applyExample = (example) => {
    setStartArticle(example.start);
    setTargetArticle(example.target);
    setDepth(example.depth);
    setStrategy(example.strategy);
    resetResultState();
  };

  const openWikipedia = (article) => {
    const slug = encodeURIComponent(String(article).trim().replaceAll(" ", "_"));
    window.open(`https://en.wikipedia.org/wiki/${slug}`, "_blank", "noreferrer");
  };

  const paintNode = useCallback(
    (node, ctx, globalScale) => {
      if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
        return;
      }

      const safeScale =
        isFiniteNumber(globalScale) && globalScale > 0 ? globalScale : 1;

      const label = node.label ?? node.id;
      const nodeType = getNodeType(node);
      const isHovered = hoveredNode?.id === node.id;
      const isImportant =
        nodeType === "start" || nodeType === "target" || nodeType === "path";

      const radius = isImportant ? 8 : 5;
      const color = NODE_COLORS[nodeType];

      if (isImportant) {
        const glow = ctx.createRadialGradient(
          node.x,
          node.y,
          radius * 0.5,
          node.x,
          node.y,
          radius * 5,
        );

        glow.addColorStop(
          0,
          nodeType === "target"
            ? "rgba(49, 168, 255, 0.42)"
            : "rgba(255, 210, 74, 0.42)",
        );
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowBlur = isImportant ? 16 : 0;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 2.2, 0, Math.PI * 2);
      ctx.strokeStyle = isImportant
        ? "rgba(255, 255, 255, 0.65)"
        : "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1 / safeScale;
      ctx.stroke();

      const shouldShowLabel = isImportant || isHovered || safeScale > 1.5;

      if (!shouldShowLabel) return;

      const fontSize = Math.max(12 / safeScale, 4.5);
      const lines = String(label).split("\n");
      const lineHeight = fontSize * 1.22;
      const textX = node.x + radius + 9;
      const textY = node.y + fontSize / 2;

      ctx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui`;
      ctx.textBaseline = "middle";

      lines.forEach((line, index) => {
        ctx.fillStyle = "rgba(3, 7, 18, 0.72)";
        ctx.fillText(line, textX + 1, textY + index * lineHeight + 1);

        ctx.fillStyle =
          nodeType === "target"
            ? "#d8efff"
            : isImportant
              ? "#fff7d6"
              : "#dce3ee";
        ctx.fillText(line, textX, textY + index * lineHeight);
      });
    },
    [getNodeType, hoveredNode],
  );

  useEffect(() => {
    if (!graphShellRef.current) return undefined;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setGraphSize({
        width: entry.contentRect.width,
        height: Math.max(entry.contentRect.height, 460),
      });
    });

    resizeObserver.observe(graphShellRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return undefined;

    const charge = graphRef.current.d3Force("charge");
    const link = graphRef.current.d3Force("link");
    const center = graphRef.current.d3Force("center");

    charge?.strength(-260);
    link?.distance((edge) => (isPathLink(edge) ? 135 : 105));
    center?.strength?.(0.08);

    const timer = setTimeout(() => fitGraphToView(800, 120), 650);

    return () => clearTimeout(timer);
  }, [graphData, fitGraphToView, isPathLink]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={resetGraphCamera}>
          <Network size={25} />
          <span>
            <strong>WikiGraph</strong>
            <small>Explore. Connect. Understand.</small>
          </span>
        </button>

        <nav className="nav-center" aria-label="Main navigation">
          <a className="nav-link active" href="#explore">
            Explore
          </a>
          <a className="nav-link" href="#algorithms">
            Algorithms
          </a>
          <a className="nav-link" href="#about">
            About
          </a>
        </nav>

        <div className="topbar-actions">
          <button className="icon-button" type="button" title="Demo mode">
            <Sparkles size={18} />
          </button>

          <button
            className="github-button"
            type="button"
            onClick={() =>
              window.open(
                "https://github.com/ashtosh-dev/wikirabit",
                "_blank",
                "noreferrer",
              )
            }
          >
            <ExternalLink size={18} />
            GitHub
          </button>
        </div>
      </header>

      <main className="workspace" id="explore">
        <aside className="left-rail">
          <section className="search-card">
            <h1>
              Discover hidden
              <br />
              Wikipedia connections
            </h1>

            <p className="hero-copy">
              Enter two topics and we&apos;ll find the shortest path connecting
              them through Wikipedia.
            </p>

            <div className="field-group">
              <label>Start article</label>
              <div className="article-input">
                <span className="node-dot start" />
                <input
                  value={startArticle}
                  onChange={(event) => handleStartChange(event.target.value)}
                  placeholder="Mathematics"
                />
                <button type="button" onClick={() => handleStartChange("")}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="field-group">
              <label>Target article</label>
              <div className="article-input">
                <span className="node-dot target" />
                <input
                  value={targetArticle}
                  onChange={(event) => handleTargetChange(event.target.value)}
                  placeholder="Music"
                />
                <button type="button" onClick={() => handleTargetChange("")}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="option-grid">
              <div className="option-box">
                <span>
                  <SlidersHorizontal size={15} />
                  Max depth
                </span>

                <select
                  value={depth}
                  onChange={(event) => setDepth(event.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="option-box">
                <span>
                  <Route size={15} />
                  Algorithm
                </span>

                <select
                  value={strategy}
                  onChange={(event) => setStrategy(event.target.value)}
                >
                  <option value="bfs">BFS</option>
                  <option value="bidirectional">Bidirectional</option>
                  <option value="dfs">DFS</option>
                </select>
              </div>
            </div>

            <div className="field-group compact">
              <label>Max links per page</label>
              <input
                className="plain-input"
                type="number"
                min="1"
                max="500"
                value={maxLinksPerPage}
                onChange={(event) => setMaxLinksPerPage(event.target.value)}
              />
            </div>

            <button
              className="primary-cta"
              type="button"
              onClick={findConnection}
              disabled={loading || pathLoading}
            >
              <span>
                {loading || pathLoading ? "Searching..." : "Find Connection"}
              </span>
              <ArrowRight size={19} />
            </button>

            <button
              className="secondary-cta"
              type="button"
              onClick={pathOnly}
              disabled={pathLoading}
            >
              Path only
            </button>

            <div className="examples">
              <p>Try examples</p>

              {EXAMPLES.map((example) => (
                <button
                  type="button"
                  key={`${example.start}-${example.target}`}
                  onClick={() => applyExample(example)}
                >
                  <span>
                    {example.start} → {example.target}
                  </span>
                  <strong>Depth {example.depth}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="stats-card">
            <div className="card-title-row">
              <p>Search stats</p>
              <span>Last search</span>
            </div>

            <div className="stats-row">
              <div>
                <Network size={22} />
                <strong>{stats.nodes}</strong>
                <span>Nodes explored</span>
              </div>

              <div>
                <Share2 size={22} />
                <strong>{stats.edges}</strong>
                <span>Edges traversed</span>
              </div>

              <div>
                <Timer size={22} />
                <strong>{searchTime}</strong>
                <span>Search time</span>
              </div>
            </div>
          </section>
        </aside>

        <section className="graph-workbench">
          <div className="graph-status-row">
            <div
              className={[
                "status-pill",
                hasPath ? "success" : hasSearchedPath ? "warning" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {hasPath ? (
                <CheckCircle2 size={18} />
              ) : (
                <CircleDot size={18} />
              )}
              <span>{statusMessage || "Ready to explore"}</span>
            </div>

            <div className="graph-actions">
              <button type="button" onClick={() => fitGraphToView(600, 110)}>
                <Maximize2 size={16} />
                Fit View
              </button>

              <button type="button" onClick={resetGraphCamera}>
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>

          <div className="graph-surface" ref={graphShellRef}>
            <div className="graph-bg-glow" />

            <ForceGraph2D
              ref={graphRef}
              width={graphSize.width}
              height={graphSize.height}
              graphData={graphData}
              nodeLabel={(node) => node.label ?? node.id}
              onNodeHover={setHoveredNode}
              onNodeClick={(node) => openWikipedia(node.label ?? node.id)}
              nodeCanvasObject={paintNode}
              nodePointerAreaPaint={(node, color, ctx) => {
                if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
                  return;
                }

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
                ctx.fill();
              }}
              linkColor={(link) =>
                isPathLink(link)
                  ? "rgba(255, 210, 74, 0.98)"
                  : "rgba(185, 199, 222, 0.16)"
              }
              linkWidth={(link) => (isPathLink(link) ? 2.5 : 0.75)}
              linkDirectionalParticles={(link) => (isPathLink(link) ? 4 : 0)}
              linkDirectionalParticleWidth={(link) =>
                isPathLink(link) ? 3.2 : 0
              }
              linkDirectionalParticleColor={() => "rgba(255, 210, 74, 0.95)"}
              linkDirectionalParticleSpeed={() => 0.008}
              cooldownTicks={180}
              d3VelocityDecay={0.28}
              enableNodeDrag
              enablePanInteraction
              enableZoomInteraction
              enablePointerInteraction
              minZoom={0.12}
              maxZoom={8}
              backgroundColor="rgba(0,0,0,0)"
              onEngineStop={() => fitGraphToView(700, 120)}
            />

            {hoveredNode && (
              <div className="node-tooltip">
                {hoveredNode.label ?? hoveredNode.id}
              </div>
            )}

            <div className="zoom-rail">
              <button type="button" title="Pan">
                <MousePointer2 size={18} />
              </button>

              <button
                type="button"
                title="Zoom in"
                onClick={() => zoomGraph(1.3)}
              >
                <ZoomIn size={18} />
              </button>

              <button
                type="button"
                title="Zoom out"
                onClick={() => zoomGraph(0.77)}
              >
                <ZoomOut size={18} />
              </button>

              <button
                type="button"
                title="Fit"
                onClick={() => fitGraphToView(500, 100)}
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>

          <section className="path-dock">
            <div className="dock-header">
              <div>
                <p>Discovered path</p>
                <strong>
                  {hasPath
                    ? `${pathLength} hop${pathLength === 1 ? "" : "s"}`
                    : hasSearchedPath
                      ? "No path found"
                      : "Not searched yet"}
                </strong>
              </div>

              <button
                className="dock-action"
                type="button"
                disabled={!hasPath || aiLoading}
                onClick={explainPath}
              >
                {aiLoading ? "Generating..." : "View Details"}
                <ExternalLink size={16} />
              </button>
            </div>

            {hasPath ? (
              <div className="path-chain">
                {shortestPath.map((article, index) => (
                  <div className="path-step-wrap" key={`${article}-${index}`}>
                    <button
                      className={[
                        "path-step",
                        index === 0 ? "start-step" : "",
                        index === shortestPath.length - 1 ? "target-step" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      type="button"
                      onClick={() => openWikipedia(article)}
                    >
                      <span className="small-node-dot" />
                      <strong>{article}</strong>
                      <small>Wikipedia</small>
                    </button>

                    {index < shortestPath.length - 1 && (
                      <ArrowRight className="path-arrow" size={18} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-path-box">
                <Search size={18} />
                <span>
                  {hasSearchedPath
                    ? "Try increasing depth, lowering max links carefully, or using the exact Wikipedia article title."
                    : "Build a graph first, then search for the shortest path."}
                </span>
              </div>
            )}

            {aiExplanation && (
              <div className="ai-result">
                <p>AI insight</p>
                <span>{aiExplanation}</span>
              </div>
            )}
          </section>
        </section>
      </main>

      <section className="info-sections">
        <article className="info-card" id="algorithms">
          <p>Algorithms</p>
          <h2>How WikiGraph finds connections</h2>
          <ul>
            <li>
              <strong>BFS</strong> explores level by level and guarantees the
              shortest path in an unweighted graph.
            </li>
            <li>
              <strong>Bidirectional BFS</strong> searches from both start and
              target, then meets in the middle for faster path discovery.
            </li>
            <li>
              <strong>DFS</strong> dives deep first to quickly surface long,
              interesting routes through related topics.
            </li>
          </ul>
        </article>

        <article className="info-card" id="about">
          <p>About</p>
          <h2>What this project is for</h2>
          <p className="info-copy">
            WikiGraph turns Wikipedia into an explorable graph so you can see
            how ideas connect, discover shortest paths between topics, and
            generate AI explanations for why those links are meaningful.
          </p>
          <p className="info-copy">
            It is built as a full-stack demo of graph algorithms, interactive
            visualization, and API-driven search over real-world knowledge
            networks.
          </p>
        </article>
      </section>
    </div>
  );
}

export default App;


