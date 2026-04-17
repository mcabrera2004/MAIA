"""Knowledge base API endpoints for document ingestion and management.

This module provides endpoints for uploading documents to the knowledge base,
listing available subjects, and managing stored documents.
Only professors can ingest and delete documents.
"""

import io
import re
from typing import List

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from pydantic import BaseModel, Field

from app.api.v1.auth import get_current_user
from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import logger
from app.models.user import User
from app.services.knowledge import get_knowledge_service

router = APIRouter()


# --- Dependencies ---


async def get_current_professor(
    user: User = Depends(get_current_user),
) -> User:
    """Verify the current user is a professor.

    Args:
        user: The authenticated user.

    Returns:
        User: The verified professor.

    Raises:
        HTTPException: If the user is not a professor.
    """
    if user.role != "profesor":
        logger.warning("unauthorized_ingestion_attempt", user_id=user.id, role=user.role)
        raise HTTPException(
            status_code=403,
            detail="Only professors can perform this action",
        )
    return user


# --- Response / Request Models ---


class IngestResponse(BaseModel):
    """Response model for document ingestion."""

    message: str = Field(..., description="Status message")
    subject: str = Field(..., description="Subject the document was ingested into")
    title: str = Field(default="", description="Title of the ingested document")
    chunks_created: int = Field(..., description="Number of chunks created from the document")


class IngestTextRequest(BaseModel):
    """Request model for text-based document ingestion."""

    content: str = Field(..., description="The text content to ingest", min_length=10)
    subject: str = Field(..., description="The subject/class this document belongs to (e.g., 'historia')")
    title: str = Field(default="", description="Title of the document")
    source: str = Field(default="", description="Source identifier for the document")


class SubjectResponse(BaseModel):
    """Response model for a single subject."""

    name: str = Field(..., description="Subject name")


# --- Endpoints ---


@router.get("/subjects", response_model=List[SubjectResponse])
@limiter.limit("30 per minute")
async def list_subjects(request: Request):
    """List all available subjects.

    This is a public endpoint — no authentication required.
    Returns the configured list of subjects for the platform.

    Args:
        request: The FastAPI request object for rate limiting.

    Returns:
        List[SubjectResponse]: All available subjects.
    """
    return [SubjectResponse(name=s) for s in settings.AVAILABLE_SUBJECTS]


@router.post("/ingest/text", response_model=IngestResponse)
@limiter.limit("20 per minute")
async def ingest_text(
    request: Request,
    ingest_request: IngestTextRequest,
    professor: User = Depends(get_current_professor),
):
    """Ingest a text document into the knowledge base. Professor only.

    The document will be chunked, embedded, and stored with subject metadata
    for filtered retrieval during chat.

    Args:
        request: The FastAPI request object for rate limiting.
        ingest_request: The document content and metadata.
        professor: The authenticated professor.

    Returns:
        IngestResponse: Status of the ingestion.
    """
    # Validate subject
    normalized_subject = ingest_request.subject.lower().strip()
    if normalized_subject not in settings.AVAILABLE_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid subject '{ingest_request.subject}'. Available: {', '.join(settings.AVAILABLE_SUBJECTS)}",
        )

    try:
        service = get_knowledge_service()
        chunks = await service.ingest_document(
            content=ingest_request.content,
            subject=normalized_subject,
            title=ingest_request.title,
            source=ingest_request.source,
        )

        logger.info(
            "document_ingested_via_api",
            user_id=professor.id,
            subject=normalized_subject,
            title=ingest_request.title,
            chunks=chunks,
        )

        return IngestResponse(
            message="Document ingested successfully",
            subject=normalized_subject,
            title=ingest_request.title,
            chunks_created=chunks,
        )
    except Exception as e:
        logger.exception("document_ingestion_failed", user_id=professor.id)
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}")


@router.post("/ingest/file", response_model=IngestResponse)
@limiter.limit("10 per minute")
async def ingest_file(
    request: Request,
    file: UploadFile = File(...),
    subject: str = Form(...),
    title: str = Form(default=""),
    professor: User = Depends(get_current_professor),
):
    """Ingest a text file (.txt, .md) into the knowledge base. Professor only.

    Args:
        request: The FastAPI request object for rate limiting.
        file: The uploaded file.
        subject: The subject/class this document belongs to.
        title: Optional title for the document.
        professor: The authenticated professor.

    Returns:
        IngestResponse: Status of the ingestion.
    """
    # Validate subject
    normalized_subject = subject.lower().strip()
    if normalized_subject not in settings.AVAILABLE_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid subject '{subject}'. Available: {', '.join(settings.AVAILABLE_SUBJECTS)}",
        )

    # Validate file type
    allowed_extensions = {".txt", ".md", ".pdf"}
    file_ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file_ext}'. Allowed: {', '.join(allowed_extensions)}",
        )

    try:
        content = await file.read()

        if file_ext == ".pdf":
            try:
                from pypdf import PdfReader
            except ImportError:
                logger.error("pypdf_not_installed")
                raise HTTPException(
                    status_code=500,
                    detail="PDF support is not installed on the server. Please contact administrator.",
                )

            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)
            text_parts = []
            for page in reader.pages:
                text = page.extract_text() or ""
                # Normalize whitespace: replace any sequence of whitespace (newlines, tabs, spaces)
                # with a single space to fix broken PDF extractions
                cleaned_text = re.sub(r"\s+", " ", text).strip()
                if cleaned_text:
                    text_parts.append(cleaned_text)
            text_content = "\n\n".join(text_parts)
        else:
            try:
                text_content = content.decode("utf-8")
            except UnicodeDecodeError:
                # Fallback to latin-1 if utf-8 fails
                text_content = content.decode("latin-1")

        if len(text_content.strip()) < 10:
            raise HTTPException(status_code=400, detail="Document content is too short (minimum 10 characters after extraction)")

        doc_title = title or file.filename

        service = get_knowledge_service()
        chunks = await service.ingest_document(
            content=text_content,
            subject=normalized_subject,
            title=doc_title,
            source=f"file:{file.filename}",
        )

        logger.info(
            "file_ingested_via_api",
            user_id=professor.id,
            subject=normalized_subject,
            filename=file.filename,
            chunks=chunks,
        )

        return IngestResponse(
            message="File ingested successfully",
            subject=normalized_subject,
            title=doc_title,
            chunks_created=chunks,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("file_ingestion_failed", user_id=professor.id, filename=file.filename)
        raise HTTPException(status_code=500, detail=f"Failed to ingest file: {str(e)}")


@router.delete("/documents/{subject}")
@limiter.limit("5 per minute")
async def delete_subject_documents(
    request: Request,
    subject: str,
    professor: User = Depends(get_current_professor),
):
    """Delete all documents for a specific subject. Professor only.

    Args:
        request: The FastAPI request object for rate limiting.
        subject: The subject whose documents should be deleted.
        professor: The authenticated professor.

    Returns:
        dict: Confirmation message.
    """
    normalized_subject = subject.lower().strip()
    if normalized_subject not in settings.AVAILABLE_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid subject '{subject}'. Available: {', '.join(settings.AVAILABLE_SUBJECTS)}",
        )

    try:
        service = get_knowledge_service()
        await service.delete_by_subject(normalized_subject)

        logger.info("documents_deleted_via_api", user_id=professor.id, subject=normalized_subject)

        return {"message": f"All documents for subject '{normalized_subject}' have been deleted"}
    except Exception as e:
        logger.exception("document_deletion_failed", user_id=professor.id, subject=normalized_subject)
        raise HTTPException(status_code=500, detail=f"Failed to delete documents: {str(e)}")
