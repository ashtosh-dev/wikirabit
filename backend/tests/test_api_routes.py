import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import networkx as nx
from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


class ApiRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("app.main.graph_service.build_graph")
    def test_build_graph_route_returns_graph_counts(self, mock_build_graph):
        graph = nx.Graph()
        graph.add_edge("Black hole", "Stephen Hawking")
        mock_build_graph.return_value = graph

        response = self.client.post(
            "/build-graph",
            json={
                "start_article": "  Black hole  ",
                "depth": 2,
                "max_links_per_page": 10,
                "strategy": "BFS",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"nodes": 2, "edges": 1, "strategy": "bfs"},
        )
        mock_build_graph.assert_called_once_with(
            start_article="Black hole",
            depth=2,
            max_links_per_page=10,
            strategy="BFS",
        )

    @patch("app.main.graph_service.build_graph")
    def test_build_graph_route_returns_400_on_validation_error(self, mock_build_graph):
        mock_build_graph.side_effect = ValueError("strategy must be either 'bfs' or 'dfs'.")

        response = self.client.post(
            "/build-graph",
            json={
                "start_article": "Black hole",
                "depth": 2,
                "max_links_per_page": 10,
                "strategy": "invalid",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "strategy must be either 'bfs' or 'dfs'.")

    @patch("app.main.graph_service.shortest_path")
    def test_shortest_path_route_returns_service_response(self, mock_shortest_path):
        mock_shortest_path.return_value = {
            "path": ["Black hole", "Physics", "Jazz"],
            "distance": 2,
            "message": None,
        }

        response = self.client.post(
            "/shortest-path",
            json={"source": "  Black hole  ", "target": "  Jazz  "},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), mock_shortest_path.return_value)
        mock_shortest_path.assert_called_once_with(
            source="Black hole",
            target="Jazz",
        )

    @patch("app.main.graph_service.graph_stats")
    def test_stats_route_returns_service_stats(self, mock_graph_stats):
        expected = {
            "nodes": 5,
            "edges": 4,
            "density": 0.4,
            "average_degree": 1.6,
            "top_hubs": [{"article": "Physics", "degree": 3}],
        }
        mock_graph_stats.return_value = expected

        response = self.client.get("/stats")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)

    @patch("app.main.graph_service.to_json")
    def test_graph_route_returns_graph_json(self, mock_to_json):
        expected = {
            "nodes": [{"id": "Black hole", "label": "Black hole", "degree": 1}],
            "edges": [{"source": "Black hole", "target": "Physics"}],
        }
        mock_to_json.return_value = expected

        response = self.client.get("/graph")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)


if __name__ == "__main__":
    unittest.main()
