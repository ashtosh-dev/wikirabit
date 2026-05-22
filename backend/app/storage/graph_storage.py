import csv
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
        self.exports_dir = self.data_dir / "exports"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)

    def _safe_stem(self, filename: str):
        cleaned = re.sub(r"[^a-zA-Z0-9_-]", "_", Path(filename).stem.strip())

        if not cleaned:
            cleaned = "graph"

        return cleaned

    def _safe_filename(self, filename: str, extension: str):
        return f"{self._safe_stem(filename)}{extension}"

    def _resolve_export_path(self, filename: str):
        file_path = (self.exports_dir / Path(filename).name).resolve()

        if file_path.parent != self.exports_dir.resolve():
            raise FileNotFoundError("Invalid export filename.")

        if not file_path.exists():
            raise FileNotFoundError(f"No export found with name: {Path(filename).name}")

        return file_path

    def save_graph(
        self,
        graph: nx.Graph,
        filename: str,
        metadata: dict | None = None,
    ):
        safe_name = self._safe_filename(filename, ".json")
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
        safe_name = self._safe_filename(filename, ".json")
        file_path = self.data_dir / safe_name

        if not file_path.exists():
            raise FileNotFoundError(f"No saved graph found with name: {safe_name}")

        with open(file_path, "r", encoding="utf-8") as file:
            payload = json.load(file)

        graph = json_graph.node_link_graph(
            payload["graph"],
            edges="links",
        )

        return graph, payload.get("metadata", {}), safe_name

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

        sessions.sort(
            key=lambda session: session["metadata"].get("saved_at", ""),
            reverse=True,
        )

        return sessions

    def rename_session(self, filename: str, new_filename: str):
        current_name = self._safe_filename(filename, ".json")
        next_name = self._safe_filename(new_filename, ".json")

        current_path = self.data_dir / current_name
        next_path = self.data_dir / next_name

        if not current_path.exists():
            raise FileNotFoundError(f"No saved graph found with name: {current_name}")

        if current_name != next_name and next_path.exists():
            raise FileExistsError(f"A saved graph named {next_name} already exists.")

        current_path.rename(next_path)

        return {
            "filename": next_name,
            "previous_filename": current_name,
        }

    def delete_session(self, filename: str):
        safe_name = self._safe_filename(filename, ".json")
        file_path = self.data_dir / safe_name

        if not file_path.exists():
            raise FileNotFoundError(f"No saved graph found with name: {safe_name}")

        file_path.unlink()

        return {
            "filename": safe_name,
            "deleted": True,
        }

    def export_graph(
        self,
        graph: nx.Graph,
        filename: str,
        export_format: str,
    ):
        normalized_format = export_format.lower().strip()

        if normalized_format == "graphml":
            safe_name = self._safe_filename(filename, ".graphml")
            file_path = self.exports_dir / safe_name
            nx.write_graphml(graph, file_path)

            return {
                "format": "graphml",
                "files": [
                    {
                        "filename": safe_name,
                        "path": str(file_path),
                    }
                ],
            }

        if normalized_format == "csv":
            safe_stem = self._safe_stem(filename)
            nodes_path = self.exports_dir / f"{safe_stem}_nodes.csv"
            edges_path = self.exports_dir / f"{safe_stem}_edges.csv"
            degree_centrality = nx.degree_centrality(graph) if graph.number_of_nodes() > 1 else {}

            with open(nodes_path, "w", encoding="utf-8", newline="") as nodes_file:
                writer = csv.DictWriter(
                    nodes_file,
                    fieldnames=["id", "label", "degree", "degree_centrality"],
                )
                writer.writeheader()

                for node in sorted(graph.nodes()):
                    writer.writerow(
                        {
                            "id": node,
                            "label": node,
                            "degree": graph.degree(node),
                            "degree_centrality": round(
                                degree_centrality.get(node, 0.0),
                                6,
                            ),
                        }
                    )

            with open(edges_path, "w", encoding="utf-8", newline="") as edges_file:
                writer = csv.DictWriter(
                    edges_file,
                    fieldnames=["source", "target"],
                )
                writer.writeheader()

                for source, target in sorted(graph.edges()):
                    writer.writerow(
                        {
                            "source": source,
                            "target": target,
                        }
                    )

            return {
                "format": "csv",
                "files": [
                    {
                        "filename": nodes_path.name,
                        "path": str(nodes_path),
                    },
                    {
                        "filename": edges_path.name,
                        "path": str(edges_path),
                    },
                ],
            }

        raise ValueError("export format must be either 'csv' or 'graphml'.")

    def get_export_path(self, filename: str):
        return self._resolve_export_path(filename)