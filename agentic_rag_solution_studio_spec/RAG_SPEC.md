# RAG Specification

## 1. Objective

Build a configurable Retrieval-Augmented Generation pipeline that supports enterprise POC use cases with citations, evaluation, and traceability.

## 2. Supported Document Types for MVP

- TXT
- Markdown
- PDF if parser is available

Future:
- DOCX
- HTML
- CSV
- Confluence/Google Drive connectors

## 3. Ingestion Pipeline

```text
File Upload
  -> File validation
  -> Text extraction
  -> Text cleaning
  -> Chunking
  -> Metadata generation
  -> Embedding generation
  -> Vector index storage
```

## 4. Text Cleaning Rules

- Remove repeated whitespace.
- Remove empty lines where appropriate.
- Preserve headings and section names when possible.
- Preserve page number metadata for PDFs if available.
- Do not remove important tables unless parser cannot handle them.

## 5. Chunking Strategy

MVP defaults:

```json
{
  "chunk_size": 800,
  "chunk_overlap": 120,
  "split_by": "recursive_character"
}
```

Recommended logic:
- Prefer section-aware splitting for Markdown.
- Use recursive text splitter for general documents.
- Store document name, page/section, chunk index, and use case ID.

## 6. Embeddings

MVP options:
- OpenAI embedding model or equivalent
- Local sentence-transformer optional

Embedding output should be associated with:
- chunk ID
- document ID
- use case ID
- vector store ID

## 7. Vector Store

MVP:
- FAISS or Chroma

Decision:
- FAISS is good for local fast similarity search.
- Chroma is easier for metadata persistence.

Recommendation:
- Start with Chroma for faster MVP persistence.
- Mention FAISS as supported alternative.

## 8. Retrieval

Input:
```json
{
  "query": "What is the refund policy for damaged delivery?",
  "usecase_id": "uc_001",
  "top_k": 5,
  "metadata_filter": null
}
```

Output:
```json
{
  "chunks": [
    {
      "chunk_id": "chk_001",
      "filename": "refund_policy.pdf",
      "score": 0.84,
      "text": "...",
      "metadata": {
        "page": 4,
        "section": "Damaged Shipment Exception"
      }
    }
  ]
}
```

## 9. Prompt Construction

Prompt should include:
- use case context
- target answer style
- retrieved chunks
- citation instructions
- refusal/insufficient context behavior

Core rule:
The model must answer only using provided context when citation_required is true.

## 10. Citation Format

Citations should include:
- filename
- section/page if available
- chunk ID

Example:
```text
Sources:
- refund_policy.pdf, Section 4.2, Chunk chk_001
- escalation_sop.md, Damaged Shipment Exception, Chunk chk_014
```

## 11. Retrieval Failure Behavior

If no relevant chunks are found:

```text
I could not find enough supporting context in the uploaded documents. Please upload the missing policy or ask a more specific question.
```

## 12. RAG Tuning Parameters

Expose in UI:
- chunk size
- chunk overlap
- top-k
- retrieval mode
- reranking on/off
- answer style
- citation required

## 13. Future RAG Enhancements

- Hybrid search
- Reranking
- Query rewriting
- Multi-query retrieval
- Metadata filters
- Context compression
- Document-level access control
- Golden dataset driven tuning
