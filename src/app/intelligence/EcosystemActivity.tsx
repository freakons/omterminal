import Link from 'next/link';
import type { Signal } from '@/data/mockSignals';
import type { FundingRound } from '@/lib/data/funding';
import type { AIModel } from '@/lib/data/models';
import type { ActiveEntity, EcosystemSnapshot, EntityMomentumRecord } from '@/db/queries';
import type { EntityMomentum } from '@/lib/intelligence/momentumIndex';
import type { SignalStrategic } from '@/lib/intelligence/strategicIndex';
import { SignalImpactBadge } from '@/components/signals/SignalImpactBadge';
import { HeatIndicator } from '@/components/intelligence/HeatIndicator';
import { EntityMomentumBadge } from '@/components/entity/EntityMomentumBadge';
import { computeSectionHeat } from '@/lib/intelligence/heatScore';
import { slugify } from '@/utils/sanitize';
import { formatSignalAge } from '@/lib/signals/signalAge';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-section renderers
// ─────────────────────────────────────────────────────────────────────────────

function SignalRow({ signal }: { signal: Signal }) {
  const cat = signal.category ?? 'signal';
  const sourceCount = signal.sourceSupportCount;
  return (
    <Link href={`/intelligence/signal/${signal.id}`} className="eco-row">
      <span className="eco-cat" data-cat={cat}>{cat}</span>
      <span className="eco-title">{signal.title}</span>
      <SignalImpactBadge
        signal={{
          significanceScore: signal.significanceScore,
          confidenceScore: signal.confidence,
          sourceSupportCount: signal.sourceSupportCount,
          affectedEntitiesCount: signal.context?.affectedEntities?.length ?? null,
        }}
        showLabel={false}
      />
      {sourceCount != null && sourceCount > 1 && (
        <span className="eco-src-count">
          <span className="indicator-dot indicator-dot--emerald" />
          {sourceCount}
        </span>
      )}
      <span className="eco-recency">{formatSignalAge(signal.date)}</span>
    </Link>
  );
}

function EntityRow({ entity }: { entity: ActiveEntity }) {
  return (
    <Link href={`/entity/${slugify(entity.name)}`} className="eco-row">
      <span className="eco-title">{entity.name}</span>
      <span className="eco-count">{entity.signalCount} signals</span>
    </Link>
  );
}

function FundingRow({ round }: { round: FundingRound }) {
  return (
    <Link href={`/entity/${slugify(round.company)}`} className="eco-row">
      <span className="eco-title">{round.company}</span>
      <span className="eco-meta">{round.amount} · {round.round}</span>
    </Link>
  );
}

function ModelRow({ model }: { model: AIModel }) {
  return (
    <Link href={`/entity/${slugify(model.company)}`} className="eco-row">
      <span className="eco-title">{model.name}</span>
      <span className="eco-meta">{model.company} · {model.releaseDate}</span>
    </Link>
  );
}

function MomentumEntityRow({ record }: { record: EntityMomentumRecord }) {
  return (
    <Link href={`/entity/${record.slug}`} className="eco-row">
      <span className="eco-title">{record.entityName}</span>
      <EntityMomentumBadge result={record.result} showScore />
    </Link>
  );
}

function scoreClass(score: number): string {
  if (score >= 65) return 'eco-score eco-score--high';
  if (score >= 35) return 'eco-score eco-score--mid';
  return 'eco-score eco-score--low';
}

function scoreLabel(score: number): string {
  if (score >= 75) return 'High';
  if (score >= 55) return 'Strong';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

function MomentumLeaderRow({ entity }: { entity: EntityMomentum }) {
  const deltaClass = entity.momentum_delta > 0
    ? 'eco-delta eco-delta--up'
    : entity.momentum_delta < 0
      ? 'eco-delta eco-delta--down'
      : 'eco-delta eco-delta--flat';
  const deltaSymbol = entity.momentum_delta > 0 ? '↑' : entity.momentum_delta < 0 ? '↓' : '→';

  return (
    <Link href={`/entity/${slugify(entity.entity_name)}`} className="eco-row">
      <span className="eco-title">{entity.entity_name}</span>
      <span className={scoreClass(entity.momentum_score)}>
        {entity.momentum_score}<span className="eco-score-lbl">{scoreLabel(entity.momentum_score)}</span>
      </span>
      <span className={deltaClass}>{deltaSymbol}</span>
    </Link>
  );
}

function StrategicSignalRow({ signal }: { signal: SignalStrategic }) {
  const cat = signal.signal_type ?? 'signal';
  return (
    <Link href={`/intelligence/signal/${signal.signal_id}`} className="eco-row">
      <span className="eco-cat" data-cat={cat}>{cat}</span>
      <span className="eco-title">{signal.signal_title}</span>
      {signal.source_support_count != null && signal.source_support_count > 1 && (
        <span className="eco-src-count">
          <span className="indicator-dot indicator-dot--emerald" />
          {signal.source_support_count}
        </span>
      )}
      <span className={scoreClass(signal.strategic_importance_score)}>
        {signal.strategic_importance_score}<span className="eco-score-lbl">{scoreLabel(signal.strategic_importance_score)}</span>
      </span>
      {signal.signal_date && (
        <span className="eco-recency">{formatSignalAge(signal.signal_date)}</span>
      )}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface EcosystemActivityProps {
  snapshot: EcosystemSnapshot;
  topMomentumEntities?: EntityMomentumRecord[];
  momentumLeaders?: EntityMomentum[];
  strategicSignals?: SignalStrategic[];
}

export function EcosystemActivity({
  snapshot,
  topMomentumEntities = [],
  momentumLeaders = [],
  strategicSignals = [],
}: EcosystemActivityProps) {
  const { topSignals, mostActiveEntities, recentFunding, modelReleases } = snapshot;

  const hasAnyData =
    topSignals.length > 0 ||
    mostActiveEntities.length > 0 ||
    recentFunding.length > 0 ||
    modelReleases.length > 0 ||
    topMomentumEntities.length > 0 ||
    momentumLeaders.length > 0 ||
    strategicSignals.length > 0;

  if (!hasAnyData) return null;

  const heat = computeSectionHeat(snapshot);

  return (
    <section className="eco-section">
      <div className="eco-header">
        <h2 className="eco-heading">Ecosystem Activity</h2>
        <span className="eco-badge">Overview</span>
      </div>

      <div className="eco-grid">
        {/* ── Top Signals ──────────────────────────────────────────── */}
        {topSignals.length > 0 && (
          <div className="eco-panel">
            <div className="eco-panel-header">
              <h3 className="eco-panel-title">Top Signals</h3>
              <HeatIndicator level={heat.topSignals} />
            </div>
            {topSignals.map((s) => <SignalRow key={s.id} signal={s} />)}
          </div>
        )}

        {/* ── Most Active Entities ─────────────────────────────────── */}
        {mostActiveEntities.length > 0 && (
          <div className="eco-panel">
            <div className="eco-panel-header">
              <h3 className="eco-panel-title">Most Active Entities</h3>
              <HeatIndicator level={heat.mostActiveEntities} />
            </div>
            {mostActiveEntities.map((e) => <EntityRow key={e.name} entity={e} />)}
          </div>
        )}

        {/* ── Top Momentum Entities ──────────────────────────────── */}
        {topMomentumEntities.length > 0 && (
          <div className="eco-panel">
            <div className="eco-panel-header">
              <h3 className="eco-panel-title">Top Momentum</h3>
            </div>
            {topMomentumEntities.map((r) => (
              <MomentumEntityRow key={r.entityName} record={r} />
            ))}
          </div>
        )}

        {/* ── Recent Funding ───────────────────────────────────────── */}
        {recentFunding.length > 0 && (
          <div className="eco-panel">
            <div className="eco-panel-header">
              <h3 className="eco-panel-title">Recent Funding</h3>
              <HeatIndicator level={heat.recentFunding} />
            </div>
            {recentFunding.map((f) => <FundingRow key={f.id} round={f} />)}
          </div>
        )}

        {/* ── Model Releases ───────────────────────────────────────── */}
        {modelReleases.length > 0 && (
          <div className="eco-panel">
            <div className="eco-panel-header">
              <h3 className="eco-panel-title">Model Releases</h3>
              <HeatIndicator level={heat.modelReleases} />
            </div>
            {modelReleases.map((m) => <ModelRow key={m.id} model={m} />)}
          </div>
        )}

        {/* ── Momentum Leaders (Entity Momentum Index) ─────────────── */}
        {momentumLeaders.length > 0 && (
          <div className="eco-panel eco-panel--momentum">
            <div className="eco-panel-header">
              <h3 className="eco-panel-title">Momentum Leaders</h3>
              <span className="eco-badge" style={{ background: 'rgba(5,150,105,0.1)', color: 'var(--emerald-l)', borderColor: 'rgba(5,150,105,0.2)' }}>Index</span>
            </div>
            {momentumLeaders.map((e) => (
              <MomentumLeaderRow key={e.entity_id} entity={e} />
            ))}
          </div>
        )}

        {/* ── Strategic Signals (Strategic Importance Index) ───────── */}
        {strategicSignals.length > 0 && (
          <div className="eco-panel eco-panel--strategic">
            <div className="eco-panel-header">
              <h3 className="eco-panel-title">Strategic Signals</h3>
              <span className="eco-badge" style={{ background: 'rgba(124,58,237,0.1)', color: '#c084fc', borderColor: 'rgba(124,58,237,0.2)' }}>Index</span>
            </div>
            {strategicSignals.map((s) => (
              <StrategicSignalRow key={s.signal_id} signal={s} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
