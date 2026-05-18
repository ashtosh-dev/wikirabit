from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware



from app.graph.graph_service import GraphService

app = FastAPI(title="Wikipedia Knowledge Graph API")

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


class BuildGraphRequest(BaseModel):
    start_article: str
    depth: int = 2
    max_links_per_page: int = 50


class PathRequest(BaseModel):
    source: str
    target: str


@app.get("/")
def home():
    return {
        "message": "Wikipedia Knowledge Graph API running"
    }


@app.post("/build-graph")
def build_graph(request: BuildGraphRequest):
    graph = graph_service.build_graph(
        request.start_article,
        request.depth,
        request.max_links_per_page
    )

    return {
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges()
    }


@app.post("/shortest-path")
def shortest_path(request: PathRequest):
    return graph_service.shortest_path(
        request.source,
        request.target
    )


@app.get("/stats")
def stats():
    return graph_service.graph_stats()


@app.get("/graph")
def get_graph():
    return graph_service.to_json()
