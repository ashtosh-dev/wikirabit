from collections import deque

import networkx as nx
import pandas as pd

from app.crawler.wiki_crawler import (
    WikiCrawler,
    WikiCrawlerError,
    WikiRateLimitError,
)
from app.storage.graph_storage import GraphStorage


class GraphService:
    def __init__(self):
        self.graph = nx.Graph()
        self.crawler = WikiCrawler()
        self.storage = GraphStorage()

        self.last_start_article = None
        self.last_depth = None
        self.last_max_links_per_page = None
        self.last_strategy = None
        self.last_target_article = None
        self.current_session_filename = None

    def build_graph(
        self,
        start_article: str,
        target_article: str | None = None,
        depth: int = 2,
        max_links_per_page: int = 30,
        max_nodes: int = 1500,
        strategy: str = "bfs",
    ):
        normalized_strategy = strategy.lower().strip()

        if normalized_strategy not in {"bfs", "dfs", "bidirectional"}:
            raise ValueError("strategy must be 'bfs', 'dfs', or 'bidirectional'.")

        start_article = start_article.strip()
        target_article = target_article.strip() if target_article else None

        if not start_article:
            raise ValueError("Start article is required.")

        if normalized_strategy == "bidirectional" and not target_article:
            raise ValueError("Target article is required for bidirectional BFS.")

        self.graph.clear()

        self.last_start_article = start_article
        self.last_target_article = target_article
        self.last_depth = depth
        self.last_max_links_per_page = max_links_per_page
        self.last_strategy = normalized_strategy

        if normalized_strategy == "dfs":
            return self._build_graph_dfs(
                start_article=start_article,
                depth=depth,
                max_links_per_page=max_links_per_page,
                max_nodes=max_nodes,
            )

        if normalized_strategy == "bidirectional":
            return self._build_graph_bidirectional(
                start_article=start_article,
                target_article=target_article,
                depth=depth,
                max_links_per_page=max_links_per_page,
                max_nodes=max_nodes,
            )

        return self._build_graph_bfs(
            start_article=start_article,
            target_article=target_article,
            depth=depth,
            max_links_per_page=max_links_per_page,
            max_nodes=max_nodes,
        )

    def _handle_crawler_error(
        self,
        error: Exception,
        article: str,
        required: bool = False,
    ) -> list[str]:
        if isinstance(error, WikiRateLimitError):
            raise ValueError(str(error)) from error

        if isinstance(error, WikiCrawlerError):
            if required:
                raise ValueError(str(error)) from error

            print(f"Skipping {article}: {error}")
            return []

        if required:
            raise ValueError(
                "Could not crawl the start article. Try again with a valid Wikipedia title."
            ) from error

        print(f"Skipping {article}: unexpected crawler error")
        return []

    def _get_links_safely(
        self,
        article: str,
        max_links_per_page: int,
        required: bool = False,
    ) -> list[str]:
        try:
            return self.crawler.get_links(article, max_links_per_page)

        except Exception as error:
            return self._handle_crawler_error(
                error=error,
                article=article,
                required=required,
            )

    def _build_graph_bfs(
        self,
        start_article: str,
        target_article: str | None,
        depth: int,
        max_links_per_page: int,
        max_nodes: int,
    ):
        visited = set()
        queued = {start_article}
        queue = deque([(start_article, 0)])

        self.graph.add_node(start_article)

        while queue:
            current_article, current_depth = queue.popleft()

            if current_article in visited:
                continue

            visited.add(current_article)

            if current_depth >= depth:
                continue

            if self.graph.number_of_nodes() >= max_nodes:
                break

            links = self._get_links_safely(
                article=current_article,
                max_links_per_page=max_links_per_page,
                required=current_article == start_article,
            )

            for link in links:
                self.graph.add_node(link)
                self.graph.add_edge(current_article, link)

                if target_article and link.lower() == target_article.lower():
                    return self.graph

                if self.graph.number_of_nodes() >= max_nodes:
                    break

                if link not in visited and link not in queued:
                    queued.add(link)
                    queue.append((link, current_depth + 1))

        return self.graph

    def _build_graph_dfs(
        self,
        start_article: str,
        depth: int,
        max_links_per_page: int,
        max_nodes: int,
    ):
        visited = set()

        self.graph.add_node(start_article)

        def dfs(article: str, current_depth: int):
            if article in visited:
                return

            if self.graph.number_of_nodes() >= max_nodes:
                return

            visited.add(article)

            if current_depth >= depth:
                return

            links = self._get_links_safely(
                article=article,
                max_links_per_page=max_links_per_page,
                required=article == start_article,
            )

            for link in links:
                self.graph.add_node(link)
                self.graph.add_edge(article, link)

                if self.graph.number_of_nodes() >= max_nodes:
                    return

                if link not in visited:
                    dfs(link, current_depth + 1)

        dfs(start_article, 0)

        return self.graph

    def _build_graph_bidirectional(
        self,
        start_article: str,
        target_article: str,
        depth: int,
        max_links_per_page: int,
        max_nodes: int,
    ):
        if start_article.lower() == target_article.lower():
            self.graph.add_node(start_article)
            return self.graph

        self.graph.add_node(start_article)
        self.graph.add_node(target_article)

        start_frontier = deque([(start_article, 0)])
        target_frontier = deque([(target_article, 0)])

        discovered_from_start = {start_article}
        discovered_from_target = {target_article}

        while start_frontier and target_frontier:
            if self.graph.number_of_nodes() >= max_nodes:
                break

            if len(start_frontier) <= len(target_frontier):
                meeting_article = self._expand_bidirectional_frontier(
                    frontier=start_frontier,
                    this_side_discovered=discovered_from_start,
                    other_side_discovered=discovered_from_target,
                    depth=depth,
                    max_links_per_page=max_links_per_page,
                    max_nodes=max_nodes,
                )
            else:
                meeting_article = self._expand_bidirectional_frontier(
                    frontier=target_frontier,
                    this_side_discovered=discovered_from_target,
                    other_side_discovered=discovered_from_start,
                    depth=depth,
                    max_links_per_page=max_links_per_page,
                    max_nodes=max_nodes,
                )

            if meeting_article:
                return self.graph

        return self.graph

    def _expand_bidirectional_frontier(
        self,
        frontier: deque,
        this_side_discovered: set[str],
        other_side_discovered: set[str],
        depth: int,
        max_links_per_page: int,
        max_nodes: int,
    ):
        if not frontier:
            return None

        current_article, current_depth = frontier.popleft()

        if current_depth >= depth:
            return None

        links = self._get_links_safely(
            article=current_article,
            max_links_per_page=max_links_per_page,
            required=True,
        )

        for link in links:
            self.graph.add_node(link)
            self.graph.add_edge(current_article, link)

            if link in other_side_discovered:
                return link

            if self.graph.number_of_nodes() >= max_nodes:
                return None

            if link not in this_side_discovered:
                this_side_discovered.add(link)
                frontier.append((link, current_depth + 1))

        return None

    def shortest_path(self, source: str, target: str):
        if source not in self.graph:
            return {
                "path": [],
                "distance": None,
                "message": (
                    "Source article was not found in the current graph. "
                    "Build a graph from this source first."
                ),
            }

        if target not in self.graph:
            return {
                "path": [],
                "distance": None,
                "message": (
                    "Target article was not reached in this bounded crawl. "
                    "Try Bidirectional BFS, increase depth slightly, or use a more directly related article."
                ),
            }

        try:
            path = nx.shortest_path(self.graph, source, target)

            return {
                "path": path,
                "distance": len(path) - 1,
                "message": None,
            }

        except nx.NetworkXNoPath:
            return {
                "path": [],
                "distance": None,
                "message": (
                    "No path found in the current graph. "
                    "Try Bidirectional BFS, increase depth slightly, or reduce how unrelated the articles are."
                ),
            }

    def graph_stats(self):
        nodes = self.graph.number_of_nodes()
        edges = self.graph.number_of_edges()

        if nodes == 0:
            return {
                "nodes": 0,
                "edges": 0,
                "density": 0,
                "average_degree": 0,
                "top_hubs": [],
            }

        degree_rows = [
            {
                "article": node,
                "degree": degree,
            }
            for node, degree in self.graph.degree()
        ]

        degree_df = pd.DataFrame(degree_rows)

        top_hubs = (
            degree_df.sort_values("degree", ascending=False)
            .head(10)
            .to_dict(orient="records")
        )

        average_degree = float(degree_df["degree"].mean())

        return {
            "nodes": nodes,
            "edges": edges,
            "density": round(nx.density(self.graph), 6),
            "average_degree": round(average_degree, 2),
            "top_hubs": top_hubs,
        }

    def centrality_stats(self, limit: int = 10):
        if self.graph.number_of_nodes() == 0:
            return {
                "articles": [],
            }

        degree_centrality = nx.degree_centrality(self.graph)
        ranked_articles = sorted(
            self.graph.nodes(),
            key=lambda node: (
                degree_centrality.get(node, 0.0),
                self.graph.degree(node),
                node.lower(),
            ),
            reverse=True,
        )

        return {
            "articles": [
                {
                    "article": article,
                    "degree": self.graph.degree(article),
                    "degree_centrality": round(
                        degree_centrality.get(article, 0.0),
                        6,
                    ),
                }
                for article in ranked_articles[:limit]
            ]
        }

    def article_connections(self, article: str, limit: int = 12):
        normalized_article = article.strip()

        if not normalized_article:
            raise ValueError("article is required.")

        if normalized_article not in self.graph:
            raise ValueError("article was not found in the current graph.")

        neighbors = sorted(
            self.graph.neighbors(normalized_article),
            key=lambda neighbor: (
                self.graph.degree(neighbor),
                neighbor.lower(),
            ),
            reverse=True,
        )

        return {
            "article": normalized_article,
            "degree": self.graph.degree(normalized_article),
            "connected_articles": [
                {
                    "article": neighbor,
                    "degree": self.graph.degree(neighbor),
                }
                for neighbor in neighbors[:limit]
            ],
        }

    def save_graph(self, filename: str, extra_metadata: dict | None = None):
        metadata = {
            "start_article": self.last_start_article,
            "target_article": self.last_target_article,
            "depth": self.last_depth,
            "max_links_per_page": self.last_max_links_per_page,
            "strategy": self.last_strategy,
            **(extra_metadata or {}),
        }

        saved = self.storage.save_graph(
            graph=self.graph,
            filename=filename,
            metadata=metadata,
        )

        self.current_session_filename = saved["filename"]

        return saved

    def load_graph(self, filename: str):
        self.graph, metadata, safe_name = self.storage.load_graph(filename)

        self.last_start_article = metadata.get("start_article")
        self.last_target_article = metadata.get("target_article")
        self.last_depth = metadata.get("depth")
        self.last_max_links_per_page = metadata.get("max_links_per_page")
        self.last_strategy = metadata.get("strategy")
        self.current_session_filename = safe_name

        return {
            "metadata": metadata,
            "stats": self.graph_stats(),
        }

    def rename_session(self, filename: str, new_filename: str):
        renamed = self.storage.rename_session(filename, new_filename)

        if self.current_session_filename == renamed["previous_filename"]:
            self.current_session_filename = renamed["filename"]

        return renamed

    def delete_session(self, filename: str):
        deleted = self.storage.delete_session(filename)

        if self.current_session_filename == deleted["filename"]:
            self.current_session_filename = None

        return deleted

    def list_sessions(self):
        sessions = self.storage.list_sessions()

        return [
            {
                **session,
                "is_current": session["filename"] == self.current_session_filename,
            }
            for session in sessions
        ]

    def export_graph(self, filename: str, export_format: str):
        if self.graph.number_of_nodes() == 0:
            raise ValueError("Build or load a graph before exporting.")

        exported = self.storage.export_graph(
            graph=self.graph,
            filename=filename,
            export_format=export_format,
        )

        return {
            **exported,
            "nodes": self.graph.number_of_nodes(),
            "edges": self.graph.number_of_edges(),
        }

    def export_path(self, filename: str):
        return self.storage.get_export_path(filename)

    def to_json(self):
        return {
            "nodes": [
                {
                    "id": node,
                    "label": node,
                    "degree": self.graph.degree(node),
                }
                for node in self.graph.nodes()
            ],
            "edges": [
                {
                    "source": source,
                    "target": target,
                }
                for source, target in self.graph.edges()
            ],
        }