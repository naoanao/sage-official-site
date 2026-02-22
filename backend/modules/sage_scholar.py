"""
Sage Scholar Module
Integrates with OpenAlex and arXiv to provide academic-backed knowledge.
"""
import requests
import logging
import xml.etree.ElementTree as ET
from urllib.parse import quote_plus
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class SageScholar:
    """
    Retrieves academic papers and insights from open access repositories.
    Focus: arXiv (CS/AI) and OpenAlex (General Science).
    """

    def __init__(self):
        self.arxiv_api_url = "http://export.arxiv.org/api/query"
        self.openalex_api_url = "https://api.openalex.org/works"
        logger.info("SageScholar initialized (arXiv + OpenAlex)")

    def search_papers(self, query: str, limit: int = 3) -> List[Dict]:
        """
        Search for papers across multiple sources.
        Returns a list of simplified paper objects.
        """
        papers = []
        
        # 1. Search arXiv (Best for AI/CS)
        arxiv_results = self._search_arxiv(query, limit)
        papers.extend(arxiv_results)

        # 2. Search OpenAlex (Best for broad science) if we need more
        if len(papers) < limit:
             openalex_limit = limit - len(papers)
             openalex_results = self._search_openalex(query, openalex_limit)
             papers.extend(openalex_results)
        
        return papers[:limit]


    def _search_arxiv(self, query: str, limit: int) -> List[Dict]:
        try:
            # Construct arXiv query
            search_query = f"all:{quote_plus(query)}"
            url = f"{self.arxiv_api_url}?search_query={search_query}&start=0&max_results={limit}&sortBy=relevance&sortOrder=descending"
            
            response = requests.get(url)
            if response.status_code != 200:
                logger.warning(f"arXiv API failed: {response.status_code}")
                return []

            root = ET.fromstring(response.content)
            namespace = {'atom': 'http://www.w3.org/2005/Atom'}
            
            papers = []
            for entry in root.findall('atom:entry', namespace):
                title = entry.find('atom:title', namespace).text.strip().replace('\n', ' ')
                summary = entry.find('atom:summary', namespace).text.strip().replace('\n', ' ')
                link = entry.find('atom:id', namespace).text.strip()
                published = entry.find('atom:published', namespace).text[:10]
                
                papers.append({
                    "source": "arXiv",
                    "title": title,
                    "summary": summary[:300] + "...", # Truncate for display
                    "url": link,
                    "date": published
                })
            
            return papers

        except Exception as e:
            logger.error(f"arXiv search error: {e}")
            return []

    def _search_openalex(self, query: str, limit: int) -> List[Dict]:
        try:
            # OpenAlex free tier (no API key needed for low volume)
            url = f"{self.openalex_api_url}?search={quote_plus(query)}&per-page={limit}"
            
            response = requests.get(url)
            if response.status_code != 200:
                logger.warning(f"OpenAlex API failed: {response.status_code}")
                return []

            data = response.json()
            papers = []
            
            for result in data.get('results', []):
                title = result.get('title')
                if not title: continue
                
                # Abstract is inverted index in OpenAlex, using simple fallback or title
                # For MVP, we use title + open_access status
                oa_status = "Open Access" if result.get('open_access', {}).get('is_oa') else "Paywall"
                link = result.get('doi') or result.get('id')
                
                papers.append({
                    "source": "OpenAlex",
                    "title": title,
                    "summary": f"({oa_status}) Scientific work indexed by OpenAlex. Cited by {result.get('cited_by_count', 0)}.", 
                    "url": link,
                    "date": str(result.get('publication_year', 'N/A'))
                })
                
            return papers

        except Exception as e:
            logger.error(f"OpenAlex search error: {e}")
            return []

# Singleton instance
sage_scholar = SageScholar()


