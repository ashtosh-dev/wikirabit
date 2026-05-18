import requests


class WikiCrawler:
    API_URL = "https://en.wikipedia.org/w/api.php"

    def __init__(self, max_links_per_page: int = 50):
        self.max_links_per_page = max_links_per_page

    def get_links(
        self,
        article_title: str,
        max_links_per_page: int | None = None,
    ) -> list[str]:
        link_limit = max_links_per_page or self.max_links_per_page
        link_limit = max(1, min(link_limit, 500))

        params = {
            "action": "query",
            "format": "json",
            "titles": article_title,
            "redirects": 1,
            "prop": "links",
            "pllimit": link_limit,
            "plnamespace": 0,
        }

        headers = {
            "User-Agent": "WikiRabitKnowledgeGraph/1.0 student-project"
        }

        response = requests.get(
            self.API_URL,
            params=params,
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()

        data = response.json()
        pages = data.get("query", {}).get("pages", {})

        links = []

        for page in pages.values():
            if "missing" in page:
                continue

            for link in page.get("links", []):
                title = link.get("title")

                if title and ":" not in title:
                    links.append(title)

                if len(links) >= link_limit:
                    break

        return links