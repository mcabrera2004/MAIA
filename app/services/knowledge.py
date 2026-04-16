"""Knowledge base service for RAG (Retrieval-Augmented Generation).

This module handles document ingestion (chunking, embedding, and storage)
and semantic retrieval filtered by subject. Uses pgvector for vector storage
and Google's text-embedding model for embeddings.
"""

from typing import List, Optional

from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_postgres import PGVector
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.core.logging import logger


class KnowledgeService:
    """Service for managing the knowledge base with subject-scoped retrieval.

    Documents are stored with a `subject` metadata field so that retrieval
    can be filtered per class/materia (e.g., matematica, historia).
    """

    def __init__(self):
        """Initialize the knowledge service with embeddings and vector store."""
        self._embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.RAG_EMBEDDING_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
        )

        # Use async engine — required for aadd_documents / asimilarity_search
        async_connection_url = (
            f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
            f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
        )

        self._async_engine = create_async_engine(async_connection_url)

        self._vector_store = PGVector(
            embeddings=self._embeddings,
            collection_name=settings.RAG_COLLECTION_NAME,
            connection=self._async_engine,
            use_jsonb=True,
        )

        self._text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.RAG_CHUNK_SIZE,
            chunk_overlap=settings.RAG_CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        logger.info(
            "knowledge_service_initialized",
            embedding_model=settings.RAG_EMBEDDING_MODEL,
            collection=settings.RAG_COLLECTION_NAME,
            chunk_size=settings.RAG_CHUNK_SIZE,
        )

    async def ingest_document(
        self,
        content: str,
        subject: str,
        title: str = "",
        source: str = "",
    ) -> int:
        """Ingest a document into the knowledge base.

        Splits the document into chunks, embeds them, and stores them
        in pgvector with subject metadata for filtered retrieval.

        Args:
            content: The full text content of the document.
            subject: The subject/class this document belongs to (e.g., "historia").
            title: Optional title of the document.
            source: Optional source identifier.

        Returns:
            int: Number of chunks ingested.
        """
        chunks = self._text_splitter.split_text(content)

        documents = [
            Document(
                page_content=chunk,
                metadata={
                    "subject": subject.lower().strip(),
                    "title": title,
                    "source": source,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                },
            )
            for i, chunk in enumerate(chunks)
        ]

        await self._vector_store.aadd_documents(documents)

        logger.info(
            "document_ingested",
            subject=subject,
            title=title,
            chunks_created=len(chunks),
        )

        return len(chunks)

    async def retrieve(
        self,
        query: str,
        subject: str,
        top_k: Optional[int] = None,
    ) -> str:
        """Retrieve relevant document chunks for a query, filtered by subject.

        Args:
            query: The search query.
            subject: The subject to filter by (e.g., "historia").
            top_k: Number of results to return. Defaults to settings.RAG_TOP_K.

        Returns:
            str: Formatted string with the retrieved chunks.
        """
        k = top_k or settings.RAG_TOP_K

        try:
            results = await self._vector_store.asimilarity_search(
                query=query,
                k=k,
                filter={"subject": subject.lower().strip()},
            )

            if not results:
                logger.info("no_rag_results", query=query[:100], subject=subject)
                return f"No se encontraron documentos relevantes para la materia '{subject}'."

            formatted_chunks = []
            for i, doc in enumerate(results, 1):
                title = doc.metadata.get("title", "Sin título")
                chunk_info = f"[Fragmento {i} - {title}]"
                formatted_chunks.append(f"{chunk_info}\n{doc.page_content}")

            context = "\n\n---\n\n".join(formatted_chunks)

            logger.info(
                "rag_retrieval_successful",
                query=query[:100],
                subject=subject,
                results_count=len(results),
            )

            return context

        except Exception as e:
            logger.exception("rag_retrieval_failed", query=query[:100], subject=subject)
            return f"Error al buscar documentos: {str(e)}"

    async def list_subjects(self) -> List[str]:
        """List all available subjects from config.

        Returns:
            List[str]: List of configured subject names.
        """
        return list(settings.AVAILABLE_SUBJECTS)

    async def delete_by_subject(self, subject: str) -> None:
        """Delete all documents for a given subject.

        Args:
            subject: The subject whose documents should be deleted.
        """
        try:
            await self._vector_store.adelete(
                filter={"subject": subject.lower().strip()}
            )
            logger.info("documents_deleted_by_subject", subject=subject)
        except Exception as e:
            logger.exception("delete_by_subject_failed", subject=subject)
            raise


# Lazy singleton — initialized on first use to avoid import-time DB connections
_knowledge_service: Optional[KnowledgeService] = None


def get_knowledge_service() -> KnowledgeService:
    """Get or create the singleton KnowledgeService instance."""
    global _knowledge_service
    if _knowledge_service is None:
        _knowledge_service = KnowledgeService()
    return _knowledge_service
