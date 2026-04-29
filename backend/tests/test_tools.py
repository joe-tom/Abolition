from unittest.mock import MagicMock, patch


def test_tavily_search_returns_markdown():
    mock_response = {
        "results": [
            {"title": "AI Safety Overview", "url": "https://example.com", "content": "Content here..."}
        ]
    }
    with patch("backend.tools.tavily_search.TavilyClient") as MockClient:
        MockClient.return_value.search.return_value = mock_response
        from backend.tools.tavily_search import tavily_search
        result = tavily_search.invoke({"query": "AI safety"})
        assert "## AI Safety Overview" in result
        assert "https://example.com" in result


def test_arxiv_search_returns_markdown():
    mock_result = MagicMock()
    mock_result.title = "Attention Is All You Need"
    mock_result.authors = [MagicMock(name="Vaswani")]
    mock_result.published.strftime.return_value = "2017-06"
    mock_result.entry_id = "https://arxiv.org/abs/1706.03762"
    mock_result.summary = "We propose a new simple network architecture..."

    with patch("backend.tools.arxiv_search.arxiv") as mock_arxiv:
        mock_arxiv.Client.return_value.results.return_value = iter([mock_result])
        mock_arxiv.Search = MagicMock()
        mock_arxiv.SortCriterion.Relevance = "relevance"
        from backend.tools.arxiv_search import arxiv_search
        result = arxiv_search.invoke({"query": "transformer attention"})
        assert "Attention Is All You Need" in result
        assert "1706.03762" in result


def test_semantic_scholar_returns_markdown():
    mock_data = {"data": [{"title": "BERT", "authors": [{"name": "Devlin"}], "year": 2019, "abstract": "We introduce BERT...", "externalIds": {"DOI": "10.18653/v1/N19-1423"}, "citationCount": 50000}]}
    with patch("backend.tools.semantic_scholar.httpx.get") as mock_get:
        mock_get.return_value.json.return_value = mock_data
        mock_get.return_value.raise_for_status = MagicMock()
        from backend.tools.semantic_scholar import semantic_scholar_search
        result = semantic_scholar_search.invoke({"query": "BERT language model"})
        assert "## BERT" in result
        assert "Devlin" in result


def test_bibtex_to_markdown_converts_entry():
    raw = """@article{vaswani2017,
  title={Attention Is All You Need},
  author={Vaswani, Ashish and others},
  year={2017},
  journal={NeurIPS}
}"""
    from backend.tools.bibtex_manager import bibtex_to_markdown
    result = bibtex_to_markdown.invoke({"raw_bibtex": raw})
    assert "vaswani2017" in result
    assert "Attention Is All You Need" in result
    assert "2017" in result


def test_bibtex_to_markdown_deduplicates():
    raw = """@article{smith2024,
  title={Test Paper},
  author={Smith},
  year={2024}
}
@article{smith2024,
  title={Test Paper},
  author={Smith},
  year={2024}
}"""
    from backend.tools.bibtex_manager import bibtex_to_markdown
    result = bibtex_to_markdown.invoke({"raw_bibtex": raw})
    assert result.count("smith2024") == 1


def test_call_write_agent_returns_string():
    mock_agent = MagicMock()
    mock_agent.invoke.return_value = {"messages": [MagicMock(content="\\section{Introduction}\nContent here.")]}
    with patch("backend.agents.subagents.create_deep_agent", return_value=mock_agent):
        with patch("backend.agents.subagents.get_model", return_value=MagicMock()):
            from backend.agents.subagents import call_write_agent
            result = call_write_agent.invoke({"task": "Write introduction chapter."})
            assert "\\section{Introduction}" in result
