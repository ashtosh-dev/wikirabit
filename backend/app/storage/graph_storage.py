import json
import re
from datetime import datetime, timezone
from pathlib import Path

import networkx as nx
from networkx.readwrite import json_graph


class GraphStorage:
    def __init__(self):
        project_root = Path(__file__).resolve().parents[3]
        self.data_dir = project_root / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _safe_filename(self, filename: str):
        cleaned = re.sub(r"[^a-zA-Z0-9_-]", "_", filename.strip())

        if not cleaned:
            cleaned = "graph"

        if not cleaned.endswith(".json"):
            cleaned += ".json"

        return cleaned

    def save_graph(
        self,
        graph: nx.Graph,
        filename: str,
        metadata: dict | None = None,
    ):
        safe_name = self._safe_filename(filename)
        file_path = self.data_dir / safe_name

        payload = {
            "metadata": {
                "saved_at": datetime.now(timezone.utc).isoformat(),
                "nodes": graph.number_of_nodes(),
                "edges": graph.number_of_edges(),
                **(metadata or {}),
            },
            "graph": json_graph.node_link_data(graph, edges="links"),
        }

        with open(file_path, "w", encoding="utf-8") as file:
            json.dump(payload, file, indent=2, ensure_ascii=False)

        return {
            "filename": safe_name,
            "path": str(file_path),
            "nodes": graph.number_of_nodes(),
            "edges": graph.number_of_edges(),
        }

    def load_graph(self, filename: str):
        safe_name = self._safe_filename(filename)
        file_path = self.data_dir / safe_name

        if not file_path.exists():
            raise FileNotFoundError(f"No saved graph found with name: {safe_name}")

        with open(file_path, "r", encoding="utf-8") as file:
            payload = json.load(file)

        graph = json_graph.node_link_graph(
            payload["graph"],
            edges="links",
        )

        return graph, payload.get("metadata", {})

    def list_sessions(self):
        sessions = []

        for file_path in sorted(self.data_dir.glob("*.json")):
            try:
                with open(file_path, "r", encoding="utf-8") as file:
                    payload = json.load(file)

                sessions.append(
                    {
                        "filename": file_path.name,
                        "metadata": payload.get("metadata", {}),
                    }
                )

            except Exception:
                continue

        return sessions