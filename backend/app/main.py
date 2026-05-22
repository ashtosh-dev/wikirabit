from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.ai.gemini_service import GeminiService
from app.graph.graph_service import GraphService


app = FastAPI(title="WikiRabit Knowledge Graph API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


graph_service = GraphService()
gemini_service = GeminiService()


class BuildGraphRequest(BaseModel):
    start_article: str
    target_article: str | None = None
    depth: int = Field(default=2, ge=0, le=5)
    max_links_per_page: int = Field(default=30, ge=1, le=100)
    max_nodes: int = Field(default=1500, ge=10, le=5000)
    strategy: str = "bfs"


class PathRequest(BaseModel):
    source: str
    target: str


class ExplainRequest(BaseModel):
    source: str
    target: str
    path: list[str] = Field(default_factory=list)


class SaveGraphRequest(BaseModel):
    filename: str = "wikirabit_graph"
    target_article: str | None = None


class LoadGraphRequest(BaseModel):
    filename: str


class ExportGraphRequest(BaseModel):
    filename: str = "wikirabit_graph"
    format: str = "csv"


class RenameSessionRequest(BaseModel):
    filename: str
    new_filename: str


@app.get("/")
def home():
    return {
        "message": "WikiRabit Knowledge Graph API running",
        "docs": "/docs",
    }


@app.post("/build-graph")
def build_graph(request: BuildGraphRequest):
    try:
        graph = graph_service.build_graph(
            start_article=request.start_article.strip(),
            target_article=(
                request.target_article.strip()
                if request.target_article
                else None
            ),
            depth=request.depth,
            max_links_per_page=request.max_links_per_page,
            max_nodes=request.max_nodes,
            strategy=request.strategy,
        )

        return {
            "nodes": graph.number_of_nodes(),
            "edges": graph.number_of_edges(),
            "strategy": request.strategy.lower(),
            "depth": request.depth,
            "max_links_per_page": request.max_links_per_page,
            "max_nodes": request.max_nodes,
        }

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/shortest-path")
def shortest_path(request: PathRequest):
    return graph_service.shortest_path(
        source=request.source.strip(),
        target=request.target.strip(),
    )


@app.post("/explain")
def explain_connection(request: ExplainRequest):
    path = request.path

    if not path:
        path_result = graph_service.shortest_path(
            source=request.source.strip(),
            target=request.target.strip(),
        )

        path = path_result.get("path", [])

        if not path:
            return {
                "explanation": None,
                "path": [],
                "message": path_result.get("message", "No path found."),
            }

    explanation_result = gemini_service.explain_connection(
        source=request.source.strip(),
        target=request.target.strip(),
        path=path,
    )

    return {
        "path": path,
        **explanation_result,
    }


@app.get("/stats")
def stats():
    return graph_service.graph_stats()


@app.get("/graph")
def get_graph():
    return graph_service.to_json()


@app.post("/save-graph")
def save_graph(request: SaveGraphRequest):
    try:
        return graph_service.save_graph(
            request.filename,
            extra_metadata={
                "target_article": request.target_article.strip()
                if request.target_article
                else None,
            },
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not save graph: {error}",
        ) from error


@app.post("/load-graph")
def load_graph(request: LoadGraphRequest):
    try:
        return graph_service.load_graph(request.filename)

    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load graph: {error}",
        ) from error


@app.get("/sessions")
def list_sessions():
    return {
        "sessions": graph_service.list_sessions(),
        "current_session": graph_service.current_session_filename,
    }


@app.post("/sessions/rename")
def rename_session(request: RenameSessionRequest):
    try:
        return graph_service.rename_session(
            filename=request.filename,
            new_filename=request.new_filename,
        )

    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    except FileExistsError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.delete("/sessions/{filename}")
def delete_session(filename: str):
    try:
        return graph_service.delete_session(filename)

    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/export-graph")
def export_graph(request: ExportGraphRequest):
    try:
        return graph_service.export_graph(
            filename=request.filename,
            export_format=request.format,
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not export graph: {error}",
        ) from error


@app.get("/exports/{filename}")
def download_export(filename: str):
    try:
        file_path = graph_service.export_path(filename)
        return FileResponse(path=file_path, filename=file_path.name)

    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.get("/centrality")
def centrality(limit: int = Query(default=10, ge=1, le=25)):
    return graph_service.centrality_stats(limit=limit)


@app.get("/connections")
def article_connections(
    article: str = Query(..., min_length=1),
    limit: int = Query(default=12, ge=1, le=50),
):
    try:
        return graph_service.article_connections(article=article, limit=limit)

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error