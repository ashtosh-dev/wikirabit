import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import networkx as nx
from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.main as main_module
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

    @patch("app.main.graph_service.save_graph")
    def test_save_graph_route_passes_target_article_metadata(self, mock_save_graph):
        mock_save_graph.return_value = {
            "filename": "demo.json",
            "nodes": 2,
            "edges": 1,
        }

        response = self.client.post(
            "/save-graph",
            json={
                "filename": "demo",
                "target_article": "  Jazz  ",
            },
        )

        self.assertEqual(response.status_code, 200)
        mock_save_graph.assert_called_once_with(
            "demo",
            extra_metadata={"target_article": "Jazz"},
        )

    @patch("app.main.graph_service.list_sessions")
    def test_sessions_route_returns_sessions_and_current_session(self, mock_list_sessions):
        mock_list_sessions.return_value = [
            {
                "filename": "demo.json",
                "metadata": {"nodes": 2, "edges": 1},
                "is_current": True,
            }
        ]

        with patch.object(main_module.graph_service, "current_session_filename", "demo.json"):
            response = self.client.get("/sessions")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "sessions": mock_list_sessions.return_value,
                "current_session": "demo.json",
            },
        )

    @patch("app.main.graph_service.rename_session")
    def test_rename_session_route_returns_renamed_session(self, mock_rename_session):
        mock_rename_session.return_value = {
            "filename": "renamed.json",
            "previous_filename": "demo.json",
        }

        response = self.client.post(
            "/sessions/rename",
            json={
                "filename": "demo",
                "new_filename": "renamed",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), mock_rename_session.return_value)

    @patch("app.main.graph_service.delete_session")
    def test_delete_session_route_returns_delete_result(self, mock_delete_session):
        mock_delete_session.return_value = {
            "filename": "demo.json",
            "deleted": True,
        }

        response = self.client.delete("/sessions/demo.json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), mock_delete_session.return_value)

    @patch("app.main.graph_service.export_graph")
    def test_export_graph_route_returns_export_files(self, mock_export_graph):
        mock_export_graph.return_value = {
            "format": "csv",
            "files": [
                {"filename": "demo_nodes.csv"},
                {"filename": "demo_edges.csv"},
            ],
            "nodes": 2,
            "edges": 1,
        }

        response = self.client.post(
            "/export-graph",
            json={
                "filename": "demo",
                "format": "csv",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), mock_export_graph.return_value)
        mock_export_graph.assert_called_once_with(
            filename="demo",
            export_format="csv",
        )

    @patch("app.main.graph_service.centrality_stats")
    def test_centrality_route_returns_ranked_articles(self, mock_centrality_stats):
        mock_centrality_stats.return_value = {
            "articles": [
                {
                    "article": "Physics",
                    "degree": 3,
                    "degree_centrality": 0.75,
                }
            ]
        }

        response = self.client.get("/centrality?limit=5")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), mock_centrality_stats.return_value)
        mock_centrality_stats.assert_called_once_with(limit=5)

    @patch("app.main.graph_service.article_connections")
    def test_connections_route_returns_connected_articles(self, mock_article_connections):
        mock_article_connections.return_value = {
            "article": "Physics",
            "degree": 3,
            "connected_articles": [{"article": "Math", "degree": 2}],
        }

        response = self.client.get("/connections?article=Physics&limit=4")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), mock_article_connections.return_value)
        mock_article_connections.assert_called_once_with(article="Physics", limit=4)


if __name__ == "__main__":
    unittest.main()
