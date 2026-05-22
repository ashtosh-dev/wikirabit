import sys
import tempfile
import unittest
from pathlib import Path

import networkx as nx


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.graph.graph_service import GraphService


class GraphServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.service = GraphService()
        self.service.storage.data_dir = Path(self.temp_dir.name) / "data"
        self.service.storage.exports_dir = self.service.storage.data_dir / "exports"
        self.service.storage.data_dir.mkdir(parents=True, exist_ok=True)
        self.service.storage.exports_dir.mkdir(parents=True, exist_ok=True)

        self.service.graph = nx.Graph()
        self.service.graph.add_edge("Python", "Programming language")
        self.service.graph.add_edge("Python", "Monty Python")
        self.service.graph.add_edge("Python", "Artificial intelligence")
        self.service.graph.add_edge("Programming language", "Artificial intelligence")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_centrality_stats_returns_ranked_articles(self):
        result = self.service.centrality_stats(limit=2)

        self.assertEqual(len(result["articles"]), 2)
        self.assertEqual(result["articles"][0]["article"], "Python")
        self.assertEqual(result["articles"][0]["degree"], 3)

    def test_article_connections_returns_neighbors_by_degree(self):
        result = self.service.article_connections("Python", limit=2)

        self.assertEqual(result["article"], "Python")
        self.assertEqual(result["degree"], 3)
        self.assertEqual(len(result["connected_articles"]), 2)

    def test_export_graph_creates_csv_files(self):
        result = self.service.export_graph("demo export", "csv")

        self.assertEqual(result["format"], "csv")
        self.assertEqual(len(result["files"]), 2)

        for exported_file in result["files"]:
            self.assertTrue(Path(exported_file["path"]).exists())

    def test_export_graph_creates_graphml_file(self):
        result = self.service.export_graph("demo export", "graphml")

        self.assertEqual(result["format"], "graphml")
        self.assertEqual(len(result["files"]), 1)
        self.assertTrue(Path(result["files"][0]["path"]).exists())

    def test_save_rename_and_delete_session_updates_current_session(self):
        saved = self.service.save_graph(
            "rabbit hole",
            extra_metadata={"target_article": "Monty Python"},
        )

        renamed = self.service.rename_session(saved["filename"], "renamed session")
        deleted = self.service.delete_session(renamed["filename"])

        self.assertEqual(saved["filename"], "rabbit_hole.json")
        self.assertEqual(renamed["filename"], "renamed_session.json")
        self.assertTrue(deleted["deleted"])
        self.assertIsNone(self.service.current_session_filename)


if __name__ == "__main__":
    unittest.main()
