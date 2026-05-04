from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
from app.database.db import get_db
from app.database.models import AgentRun, UseCase

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])


class ProviderStats(BaseModel):
    provider: str
    run_count: int
    avg_latency_ms: Optional[float]
    avg_cost_usd: Optional[float]
    total_tokens: int


class BenchmarkSummary(BaseModel):
    usecase_id: str
    total_runs: int
    completed_runs: int
    # Latency
    avg_latency_ms: Optional[float]
    p50_latency_ms: Optional[int]
    p90_latency_ms: Optional[int]
    p95_latency_ms: Optional[int]
    # Tokens
    total_input_tokens: int
    total_output_tokens: int
    avg_tokens_per_run: Optional[float]
    # Cost
    total_cost_usd: float
    avg_cost_usd: Optional[float]
    # Provider breakdown
    providers: list[ProviderStats]
    # Risk distribution
    risk_distribution: dict[str, int]
    # Sparkline data (last 30 runs, ordered oldest→newest)
    recent_latencies: list[Optional[int]]
    recent_costs: list[Optional[float]]


def _percentile(sorted_vals: list, pct: float) -> Optional[int]:
    if not sorted_vals:
        return None
    idx = int(len(sorted_vals) * pct / 100)
    idx = min(idx, len(sorted_vals) - 1)
    return sorted_vals[idx]


@router.get("/{usecase_id}", response_model=BenchmarkSummary)
async def get_benchmarks(usecase_id: str, db: Session = Depends(get_db)):
    uc = db.query(UseCase).filter(UseCase.id == usecase_id).first()
    if not uc:
        raise HTTPException(status_code=404, detail="Use case not found")

    runs = (
        db.query(AgentRun)
        .filter(AgentRun.usecase_id == usecase_id)
        .order_by(AgentRun.created_at.asc())
        .all()
    )

    completed = [r for r in runs if r.status == "completed"]
    latencies = sorted([r.latency_ms for r in completed if r.latency_ms is not None])
    costs = [r.estimated_cost_usd for r in completed if r.estimated_cost_usd is not None]

    avg_latency = (sum(latencies) / len(latencies)) if latencies else None
    avg_cost = (sum(costs) / len(costs)) if costs else None
    total_cost = sum(costs) if costs else 0.0

    total_input = sum(r.input_tokens or 0 for r in completed)
    total_output = sum(r.output_tokens or 0 for r in completed)
    total_tokens_all = total_input + total_output
    avg_tokens = (total_tokens_all / len(completed)) if completed else None

    # Provider breakdown
    from collections import defaultdict
    prov_map: dict[str, list[AgentRun]] = defaultdict(list)
    for r in completed:
        prov_map[r.provider or "openai"].append(r)

    provider_stats = []
    for prov, pruns in prov_map.items():
        p_lats = [r.latency_ms for r in pruns if r.latency_ms is not None]
        p_costs = [r.estimated_cost_usd for r in pruns if r.estimated_cost_usd is not None]
        p_tokens = sum((r.input_tokens or 0) + (r.output_tokens or 0) for r in pruns)
        provider_stats.append(ProviderStats(
            provider=prov,
            run_count=len(pruns),
            avg_latency_ms=round(sum(p_lats) / len(p_lats), 1) if p_lats else None,
            avg_cost_usd=round(sum(p_costs) / len(p_costs), 6) if p_costs else None,
            total_tokens=p_tokens,
        ))

    # Risk distribution
    risk_dist: dict[str, int] = {"low": 0, "medium": 0, "high": 0, "unknown": 0}
    for r in completed:
        key = r.risk_level if r.risk_level in risk_dist else "unknown"
        risk_dist[key] += 1

    # Sparkline: last 30 completed runs
    recent = completed[-30:]
    recent_latencies = [r.latency_ms for r in recent]
    recent_costs = [r.estimated_cost_usd for r in recent]

    return BenchmarkSummary(
        usecase_id=usecase_id,
        total_runs=len(runs),
        completed_runs=len(completed),
        avg_latency_ms=round(avg_latency, 1) if avg_latency else None,
        p50_latency_ms=_percentile(latencies, 50),
        p90_latency_ms=_percentile(latencies, 90),
        p95_latency_ms=_percentile(latencies, 95),
        total_input_tokens=total_input,
        total_output_tokens=total_output,
        avg_tokens_per_run=round(avg_tokens, 1) if avg_tokens else None,
        total_cost_usd=round(total_cost, 6),
        avg_cost_usd=round(avg_cost, 6) if avg_cost else None,
        providers=provider_stats,
        risk_distribution=risk_dist,
        recent_latencies=recent_latencies,
        recent_costs=recent_costs,
    )
