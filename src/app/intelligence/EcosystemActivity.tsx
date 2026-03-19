import Link from 'next/link';
import type { Signal } from '@/data/mockSignals';
import type { FundingRound } from '@/lib/data/funding';
import type { AIModel } from '@/lib/data/models';
import type { ActiveEntity, EcosystemSnapshot, EntityMomentumRecord } from '@/db/queries';
import { SignalImpactBadge } from '@/components/signals/SignalImpactBadge';
import { HeatIndicator } from '@/components/intelligence/HeatIndicator';
import { EntityMomentumBadge } from '@/components/entity/EntityMomentumBadge';
import { computeSectionHeat } from '@/lib/intelligence/heatScore';
import { slugify } from '@/utils/sanitize';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-section renderers
// ─────────────────────────────────────────────────────────────────────────────

function SignalRow({ signal }: { signal: Signal }) {
  const cat = signal.category ?? 'signal';
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
      <span className="eco-meta">{signal.entityName}</span>
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

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface EcosystemActivityProps {
  snapshot: EcosystemSnapshot;
  topMomentumEntities?: EntityMomentumRecord[];
}

export function EcosystemActivity({ snapshot, topMomentumEntities = [] }: EcosystemActivityProps) {
  const { topSignals, mostActiveEntities, recentFunding, modelReleases } = snapshot;

  const hasAnyData =
    topSignals.length > 0 ||
    mostActiveEntities.length > 0 ||
    recentFunding.length > 0 ||
    modelReleases.length > 0 ||
    topMomentumEntities.length > 0;

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
      </div>
    </section>
  );
}
