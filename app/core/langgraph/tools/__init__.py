"""LangGraph tools for enhanced language model capabilities.

This package contains custom tools that can be used with LangGraph to extend
the capabilities of language models. Currently includes tools for web search
and knowledge base retrieval (RAG).
"""

from langchain_core.tools.base import BaseTool

from .duckduckgo_search import duckduckgo_search_tool
from .knowledge_retriever import knowledge_retriever

tools: list[BaseTool] = [duckduckgo_search_tool, knowledge_retriever]
