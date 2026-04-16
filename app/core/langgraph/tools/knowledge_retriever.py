"""Knowledge retriever tool for Agentic RAG.

This tool allows the LLM agent to search the knowledge base for relevant
documents filtered by the current session's subject. The agent decides
*when* to call this tool based on the user's question.
"""

from langchain_core.tools import tool

from app.core.logging import logger
from app.services.knowledge import get_knowledge_service


@tool
async def knowledge_retriever(query: str, subject: str) -> str:
    """Search the knowledge base for relevant information about a specific subject.

    Use this tool when the user asks a question that requires information from
    course materials, class notes, or study documents. Always provide the
    subject (materia) to filter results appropriately.

    Args:
        query: The search query describing what information you need.
        subject: The subject/class to search in (e.g., "matematica", "historia").

    Returns:
        Relevant document fragments from the knowledge base for that subject.
    """
    try:
        service = get_knowledge_service()
        results = await service.retrieve(query=query, subject=subject)

        logger.info(
            "knowledge_retriever_tool_called",
            query=query[:100],
            subject=subject,
        )

        return results
    except Exception as e:
        logger.error("knowledge_retriever_tool_error", error=str(e), query=query[:100], subject=subject)
        return f"Error searching knowledge base: {str(e)}"
