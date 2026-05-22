# 🕳️ wikirabit

> *Fall down the Wikipedia rabbit hole — intelligently.*

A full-stack knowledge graph engine that crawls Wikipedia N levels deep, maps how concepts connect using BFS/DFS, finds the shortest path between any two unrelated topics, and uses AI to explain **why** those connections are surprisingly meaningful.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=white)
![NetworkX](https://img.shields.io/badge/NetworkX-Graph_Engine-orange?style=flat)
![Gemini](https://img.shields.io/badge/Gemini-AI_Insights-4285F4?style=flat&logo=google&logoColor=white)

---

## What it does

Give wikirabit any Wikipedia article and a crawl depth — it will:

1. **Crawl** all internal Wikipedia links N levels deep using BFS
2. **Build** a knowledge graph of how concepts connect (nodes = articles, edges = links)
3. **Find** the shortest path between any two topics using BFS path search
4. **Explain** why two seemingly unrelated topics are connected, using Gemini AI

### Example

```
Start: "Black Hole"   →   Target: "Jazz Music"   Depth: 2

Path found (6 hops):
Black Hole → Stephen Hawking → Cambridge University →
Charles Darwin → Evolution → African Genetics → Jazz Music

AI Insight: "Physics and Jazz share a common ancestor in humanity's
origin story. Hawking studied at the same institution that shaped
Darwin, whose evolutionary theories traced human migration out of
Africa — the continent whose rich musical heritage directly birthed Jazz."
```

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| Backend | Python + FastAPI | REST API, crawl orchestration |
| Crawler | BeautifulSoup4 + requests | Wikipedia HTML parsing |
| Graph Engine | NetworkX | BFS/DFS, shortest path (BFS), graph storage |
| Data Layer | pandas + numpy | Node metadata, link frequency analysis |
| AI Insights | Google Gemini API | Natural language connection explanations |
| Storage | JSON / File I/O | Graph persistence across sessions |
| Frontend | React + CSS | Interactive graph visualization |

---

## Project Structure

```
wikirabit/
├── backend/
│   └── app/
│       ├── api/              # FastAPI route handlers
│       ├── crawler/          # Wikipedia BFS crawler
│       ├── graph/            # Graph class (OOP), BFS/DFS logic
│       ├── models/           # Pydantic data models
│       ├── storage/          # File I/O — save/load graph JSON
│       └── main.py           # FastAPI entry point
├── frontend/                 # React app — graph visualization UI
├── data/                     # Saved graph dumps (auto-generated)
├── requirements.txt
└── README.md
```

---

## Core Algorithms

### BFS Crawler
Crawls Wikipedia level by level. Each article's internal links become the next frontier. Stops at depth N or a max-node limit to avoid runaway crawls.



---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/build-graph` | Build a BFS or DFS graph from a starting article |
| `POST` | `/shortest-path` | Find the shortest path between two articles |
| `POST` | `/explain` | Generate a Gemini explanation for a path |
| `GET` | `/graph` | Return full graph as node/edge JSON |
| `GET` | `/stats` | Node count, edge count, depth, top hubs |
| `GET` | `/centrality` | Top articles ranked by degree centrality |
| `GET` | `/connections?article=X` | Directly connected articles for a node |
| `POST` | `/save-graph` | Save the current graph session to disk |
| `POST` | `/load-graph` | Load a saved graph session |
| `GET` | `/sessions` | List saved graph sessions |
| `POST` | `/sessions/rename` | Rename a saved graph session |
| `DELETE` | `/sessions/{filename}` | Delete a saved graph session |
| `POST` | `/export-graph` | Export the graph as CSV or GraphML |

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/)

### Backend

```bash
git clone https://github.com/ashtosh-dev/wikirabit.git
cd wikirabit


pip install -r requirements.txt

# Add your Gemini key
echo "GEMINI_API_KEY=your_key_here" > .env

cd backend
uvicorn app.main:app --reload
```

API runs at `http://localhost:8000` — docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs at `http://localhost:5173`

### Docker

```bash
docker compose up --build
```

Backend runs at `http://localhost:8000` and frontend runs at `http://localhost:5173`.

---

## Roadmap

- [x] Wikipedia BFS crawler
- [x] Graph construction with NetworkX
- [x] FastAPI backend with crawl + path endpoints
- [x] React frontend with graph visualization
- [x] pandas node metadata storage
- [x] File I/O — save/load graph sessions
- [x] DFS mode toggle (BFS vs DFS comparison)
- [x] Gemini AI connection explanations
- [x] Graph export (CSV / GraphML)
- [x] Crawl history and session management
- [x] Degree centrality — find the most "connected" articles
- [x] Docker setup for one-command run

---

## Why this project?

Wikipedia is a giant undirected graph of human knowledge. Every article links to others — forming a web where surprisingly distant concepts are only a handful of hops apart. This project makes that invisible structure visible and lets you ask: *how did we get from Black Holes to Jazz?*

It's also a practical demonstration of core CS concepts in action — BFS/DFS on real data, OOP graph design, REST API architecture, and AI-augmented reasoning — all connected through a single, genuinely fun interface.

---

## Contributors

- [ashtosh-dev](https://github.com/ashtosh-dev)
- [kani-369](https://github.com/kani-369)
---

