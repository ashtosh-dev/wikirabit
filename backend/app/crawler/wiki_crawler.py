import time

import requests


class WikiRateLimitError(Exception):
    pass


class WikiCrawlerError(Exception):
    pass


class WikiCrawler:
    API_URL = "https://en.wikipedia.org/w/api.php"

    def __init__(self, max_links_per_page: int = 50):
        self.max_links_per_page = max_links_per_page
        self.session = requests.Session()
        self.cache = {}

    def get_links(
        self,
        article_title: str,
        max_links_per_page: int | None = None,
    ) -> list[str]:
        normalized_title = article_title.strip()

        if not normalized_title:
            return []

        link_limit = max_links_per_page or self.max_links_per_page
        link_limit = max(1, min(link_limit, 500))

        cache_key = (normalized_title.lower(), link_limit)

        if cache_key in self.cache:
            return self.cache[cache_key]

        params = {
            "action": "query",
            "format": "json",
            "titles": normalized_title,
            "redirects": 1,
            "prop": "links",
            "pllimit": link_limit,
            "plnamespace": 0,
        }

        headers = {
            "User-Agent": "WikiRabitKnowledgeGraph/1.0 student-project"
        }

        try:
            response = self.session.get(
                self.API_URL,
                params=params,
                headers=headers,
                timeout=10,
            )

            if response.status_code == 429:
                raise WikiRateLimitError(
                    "Wikipedia is rate-limiting requests. Wait for a minute, "
                    "then try again with lower depth or fewer links per page."
                )

            response.raise_for_status()

        except WikiRateLimitError:
            raise

        except requests.Timeout as error:
            raise WikiCrawlerError(
                "Wikipedia took too long to respond. Try lower depth or fewer links per page."
            ) from error

        except requests.RequestException as error:
            raise WikiCrawlerError(
                "Could not contact Wikipedia right now. Check your internet connection and try again."
            ) from error

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

        time.sleep(0.08)

        self.cache[cache_key] = links
        return links