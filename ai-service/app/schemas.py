"""Pydantic request/response schemas."""
from __future__ import annotations

from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    title: str = Field(..., examples=["Company Handbook"])
    content: str = Field(..., min_length=1)
    source: str | None = Field(None, examples=["handbook.pdf"])


class IngestResponse(BaseModel):
    document_id: int
    title: str
    chunks_created: int


class DocumentSummary(BaseModel):
    id: int
    title: str
    source: str | None
    chunks: int


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, examples=["What is the refund policy?"])
    top_k: int | None = Field(None, ge=1, le=20)


class Citation(BaseModel):
    document_id: int
    document_title: str
    chunk_index: int
    score: float
    snippet: str


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]


class EvidenceField(BaseModel):
    page: int
    field: str
    text: str


class EvidenceAnalyzeResponse(BaseModel):
    document_type: str
    activity_type: str
    reference_table: str | None = None
    publication_item_code: str | None = None
    publication_item_label: str | None = None
    publication_category: str | None = None
    classification_reason: str | None = None
    suggested_rule_code: str | None = None
    title: str | None = None
    authors: list[str] = Field(default_factory=list)
    doi: str | None = None
    publication_year: int | None = None
    source_name: str | None = None
    classification: str | None = None
    confidence: float = Field(ge=0, le=1)
    needs_review: bool
    model: str
    evidence: list[EvidenceField] = Field(default_factory=list)
