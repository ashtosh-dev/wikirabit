from collections import deque

import networkx as nx
import pandas as pd

from app.crawler.wiki_crawler import WikiCrawler
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

    def build_graph(
        self,
        start_article: str,
        depth: int = 2,
        max_links_per_page: int = 50,
        strategy: str = "bfs",
    ):
        normalized_strategy = strategy.lower().strip()

        if normalized_strategy not in {"bfs", "dfs"}:
            raise ValueError("strategy must be either 'bfs' or 'dfs'.")

        self.graph.clear()

        self.last_start_article = start_article
        self.last_depth = depth
        self.last_max_links_per_page = max_links_per_page
        self.last_strategy = normalized_strategy

        if normalized_strategy == "dfs":
            return self._build_graph_dfs(
                start_article=start_article,
                depth=depth,
                max_links_per_page=max_links_per_page,
            )

        return self._build_graph_bfs(
            start_article=start_article,
            depth=depth,
            max_links_per_page=max_links_per_page,
        )

    def _build_graph_bfs(
        self,
        start_article: str,
        depth: int,
        max_links_per_page: int,
    ):
        visited = set()
        queue = deque([(start_article, 0)])

        self.graph.add_node(start_article)

        while queue:
            current_article, current_depth = queue.popleft()

            if current_article in visited:
                continue

            visited.add(current_article)

            if current_depth >= depth:
                continue

            try:
                links = self.crawler.get_links(
                    current_article,
                    max_links_per_page,
                )

            except Exception as error:
                print(f"Error crawling {current_article}: {error}")
                continue

            for link in links:
                self.graph.add_node(link)
                self.graph.add_edge(current_article, link)

                if link not in visited:
                    queue.append((link, current_depth + 1))

        return self.graph

    def _build_graph_dfs(
        self,
        start_article: str,
        depth: int,
        max_links_per_page: int,
    ):
        visited = set()

        self.graph.add_node(start_article)

        def dfs(article: str, current_depth: int):
            if article in visited:
                return

            visited.add(article)

            if current_depth >= depth:
                return

            try:
                links = self.crawler.get_links(
                    article,
                    max_links_per_page,
                )

            except Exception as error:
                print(f"Error crawling {article}: {error}")
                return

            for link in links:
                self.graph.add_node(link)
                self.graph.add_edge(article, link)

                if link not in visited:
                    dfs(link, current_depth + 1)

        dfs(start_article, 0)

        return self.graph

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
                    "Target article was not found in the current graph. "
                    "Increase depth or max links per page."
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
                "message": "No path found in the current graph.",
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

    def save_graph(self, filename: str):
        metadata = {
            "start_article": self.last_start_article,
            "depth": self.last_depth,
            "max_links_per_page": self.last_max_links_per_page,
            "strategy": self.last_strategy,
        }

        return self.storage.save_graph(
            graph=self.graph,
            filename=filename,
            metadata=metadata,
        )

    def load_graph(self, filename: str):
        self.graph, metadata = self.storage.load_graph(filename)

        self.last_start_article = metadata.get("start_article")
        self.last_depth = metadata.get("depth")
        self.last_max_links_per_page = metadata.get("max_links_per_page")
        self.last_strategy = metadata.get("strategy")

        return {
            "metadata": metadata,
            "stats": self.graph_stats(),
        }

    def list_sessions(self):
        return self.storage.list_sessions()

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