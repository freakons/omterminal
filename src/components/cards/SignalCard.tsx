'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { SignalImpactBadge } from '@/components/signals/SignalImpactBadge';
import { SignalMomentumBadge } from '@/components/signals/SignalMomentumBadge';
import { SignalContextPreview } from '@/components/signals/SignalContextPreview';
import { EntityQuickProfile } from '@/components/entity/EntityQuickProfile';
import type { SignalWithRankMeta } from '@/lib/signals/feedComposer';
import type { SignalExplanation } from '@/lib/signals/explanationLayer';
import { isHot, isRecent, formatSignalAge } from '@/lib/signals/signalAge';

interface SignalWithExplanation extends SignalWithRankMeta {
  explanation?: SignalExplanation;
}

interface SignalCardProps {
  signal: SignalWithExplanation;
}

/**
 * SignalCard — Intelligence feed card with significance, corroboration,
 * explanation indicators, and inline context preview.  Renders signals
 * from the composed feed with visual cues for importance level, source
 * coverage, and analyst context.
 */
export function SignalCard({ signal }: SignalCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const tier = signal._significanceTier ?? 'standard';
  const sourceCount = signal._sourceCount ?? signal.sourceSupportCount;
  const explanation = signal.explanation;
  const context = signal.context ?? null;

  // Show preview toggle when context exists OR when we want to show the fallback
  const hasContextFields = Boolean(
    context?.whyItMatters || context?.implications?.length || context?.sourceBasis
  );

  // Route to signal detail page
  const href = `/signals/${encodeURIComponent(signal.id)}`;

  const hot = isHot(signal.date);

  return (
    <div className={`nc${tier === 'critical' ? ' nc-critical' : tier === 'high' ? ' nc-high' : ''}${hot ? ' nc-hot' : ''}`}>
      {/* Clickable area for navigation */}
      <Link href={href} className="nc-link">
        {/* Top meta row */}
        <div className="nc-top">
          <div className="nc-badges">
            <Badge category={signal.category} />
            {tier === 'critical' && (
              <span className="sig-badge sig-critical">
                {explanation?.importanceLabel ?? 'Major'}
              </span>
            )}
            {tier === 'high' && (
              <span className="sig-badge sig-high">
                {explanation?.importanceLabel ?? 'Notable'}
              </span>
            )}
            <SignalImpactBadge
              signal={{
                significanceScore: signal.significanceScore,
                confidenceScore: signal.confidence,
                sourceSupportCount: signal.sourceSupportCount,
                affectedEntitiesCount: signal.context?.affectedEntities?.length ?? null,
              }}
              showLabel={false}
            />
            {signal.momentum && (
              <SignalMomentumBadge momentum={signal.momentum} showLabel={false} />
            )}
          </div>
          <div className="nc-indicators">
            {sourceCount != null && sourceCount > 1 && (
              <span
                className="corroboration-badge"
                title={explanation?.corroborationSummary ?? `Corroborated by ${sourceCount} sources`}
              >
                <span className="indicator-dot indicator-dot--emerald" />
                {sourceCount} sources
              </span>
            )}
            {signal.confidence >= 90 && (
              <span className="verified" title="Confidence: Verified — Score of 90 or above indicates high-confidence intelligence.">
                <span className="indicator-dot indicator-dot--emerald" />
                {explanation?.confidenceLabel ?? 'Verified'}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="nc-title">{signal.title}</h3>

        {/* Summary */}
        <p className="nc-body">{signal.summary}</p>

        {/* Why This Matters — intelligence layer (migration 014) */}
        {(signal.whyThisMatters || explanation?.whyThisMatters || signal.context?.whyItMatters) && (
          <div className="nc-why">
            <span className="nc-why-label">Why this matters</span>
            {signal.whyThisMatters ?? explanation?.whyThisMatters ?? signal.context?.whyItMatters}
          </div>
        )}

        {/* Strategic impact + who should care (collapsible intelligence) */}
        {(signal.strategicImpact || signal.whoShouldCare) && (
          <div className="nc-intel">
            {signal.strategicImpact && (
              <div className="nc-intel-row">
                <span className="nc-intel-label">Strategic impact</span>
                {signal.strategicImpact}
              </div>
            )}
            {signal.whoShouldCare && (
              <div className="nc-intel-row">
                <span className="nc-intel-label">Who should care</span>
                {signal.whoShouldCare}
              </div>
            )}
          </div>
        )}

        {/* Affected entities */}
        {explanation?.affectedEntities && explanation.affectedEntities.length > 1 && (
          <div className="nc-affected">
            <span className="nc-affected-label">Affects:</span> {explanation.affectedEntities.join(', ')}
          </div>
        )}
      </Link>

      {/* Preview toggle — outside the Link to avoid navigation */}
      {(hasContextFields || context != null) && (
        <button
          className="nc-preview-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewOpen((o) => !o);
          }}
          aria-expanded={previewOpen}
          aria-controls={`preview-${signal.id}`}
        >
          <span className={`nc-preview-chevron${previewOpen ? ' nc-preview-chevron--open' : ''}`}>
            ▾
          </span>
          {previewOpen ? 'Hide preview' : 'Preview'}
        </button>
      )}

      {/* Expandable context preview */}
      <div id={`preview-${signal.id}`}>
        <SignalContextPreview context={context} expanded={previewOpen} />
      </div>

      {/* Footer */}
      <div className="nc-foot">
        <span className="nc-src">
          <span className="indicator-dot indicator-dot--indigo" />
          {signal.entityName ? (
            <EntityQuickProfile entityName={signal.entityName}>
              {signal.entityName}
            </EntityQuickProfile>
          ) : (
            'Intelligence'
          )}
        </span>
        <Link href={href} className="nc-link">
          <span className={`nc-date${hot ? ' nc-date--hot' : isRecent(signal.date) ? ' nc-date--recent' : ''}`}>
            {hot && <span className="nc-date-live-dot" aria-hidden="true" />}
            {formatSignalAge(signal.date)}
          </span>
        </Link>
      </div>

      {/* Open signal affordance */}
      <Link href={href} className="nc-link">
        <span className="nc-open-hint">Open signal</span>
      </Link>
    </div>
  );
}

