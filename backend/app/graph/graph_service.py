from collections import deque
import networkx as nx

from app.crawler.wiki_crawler import WikiCrawler


class GraphService:
    def __init__(self):
        self.graph = nx.Graph()
        self.crawler = WikiCrawler()

    def build_graph(
        self,
        start_article: str,
        depth: int = 2,
        max_links_per_page: int = 50
    ):
        self.graph.clear()

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
                    max_links_per_page
                )
                print(f"{current_article} -> {len(links)} links")
            except Exception as e:
                print(f"Error crawling {current_article}: {e}")
                continue

            for link in links:
                self.graph.add_node(link)
                self.graph.add_edge(current_article, link)

                if link not in visited:
                    queue.append((link, current_depth + 1))

        return self.graph

    def shortest_path(self, source: str, target: str):
        if target not in self.graph:
            return {
                "path": [],
                "distance": None,
                "message": (
                    "Target article was not found in the current graph. "
                    "Increase depth or max links."
                )
            }

        try:
            path = nx.shortest_path(self.graph, source, target)
            return {
                "path": path,
                "distance": len(path) - 1,
                "message": None
            }
        except Exception:
            return {
                "path": [],
                "distance": None,
                "message": "No path found in the current graph."
            }

    def graph_stats(self):
        return {
            "nodes": self.graph.number_of_nodes(),
            "edges": self.graph.number_of_edges()
        }
    
    def to_json(self):
        return {
            "nodes": [
                {"id": node, "label": node}
                for node in self.graph.nodes()
            ],
            "edges": [
                {"source": source, "target": target}
                for source, target in self.graph.edges()
            ]
        }
