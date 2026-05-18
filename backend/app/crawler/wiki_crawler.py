import requests


class WikiCrawler:
    API_URL = "https://en.wikipedia.org/w/api.php"

    def __init__(self, max_links_per_page=50):
        self.max_links_per_page = max_links_per_page

    def get_links(self, article_title: str, max_links_per_page: int | None = None):
        link_limit = max_links_per_page or self.max_links_per_page
        params = {
            "action": "query",
            "format": "json",
            "titles": article_title,
            "prop": "links",
            "pllimit": link_limit,
        }

        headers = {
            "User-Agent": "WikipediaKnowledgeGraphProject/1.0 (student project)"
        }

        response = requests.get(
            self.API_URL,
            params=params,
            headers=headers,
            timeout=10
        )

        response.raise_for_status()

        data = response.json()
        pages = data.get("query", {}).get("pages", {})

        links = []

        for page in pages.values():
            for link in page.get("links", []):
                title = link.get("title")

                if title and ":" not in title:
                    links.append(title)

                if len(links) >= link_limit:
                    break

        print(f"{article_title} -> {len(links)} links")
        return links
