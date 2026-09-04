import { useEffect } from 'react'
import { Activity, Brain, Coins, DatabaseZap, FolderKanban, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store'
import { ClaudeUsageLoadingState } from './ClaudeUsageLoadingState'
import { StatCard } from './StatCard'
import { UsageFilterRadioGroup, UsageTrackingPaneShell } from './UsageTrackingPaneShell'
import { PiUsageDetails } from './PiUsageDetails'
import { formatCost, formatTokens, formatUpdatedAt } from './usage-formatters'
import { translate } from '@/i18n/i18n'
import type { PiUsageRange } from '../../../../shared/pi-usage-types'

const RANGE_OPTIONS: PiUsageRange[] = ['7d', '30d', '90d', 'all']
const RANGE_LABELS: Record<PiUsageRange, string> = {
  get '7d'() {
    return translate('auto.components.stats.PiUsagePane.rangeLast7Days', 'Last 7 days')
  },
  get '30d'() {
    return translate('auto.components.stats.PiUsagePane.rangeLast30Days', 'Last 30 days')
  },
  get '90d'() {
    return translate('auto.components.stats.PiUsagePane.rangeLast90Days', 'Last 90 days')
  },
  get all() {
    return translate('auto.components.stats.PiUsagePane.rangeAllTime', 'All time')
  }
}

export function PiUsagePane(): React.JSX.Element {
  const scanState = useAppStore((state) => state.piUsageScanState)
  const summary = useAppStore((state) => state.piUsageSummary)
  const daily = useAppStore((state) => state.piUsageDaily)
  const modelBreakdown = useAppStore((state) => state.piUsageModelBreakdown)
  const projectBreakdown = useAppStore((state) => state.piUsageProjectBreakdown)
  const recentSessions = useAppStore((state) => state.piUsageRecentSessions)
  const range = useAppStore((state) => state.piUsageRange)
  const fetchPiUsage = useAppStore((state) => state.fetchPiUsage)
  const setPiUsageRange = useAppStore((state) => state.setPiUsageRange)
  const setPiUsageEnabled = useAppStore((state) => state.setPiUsageEnabled)
  const refreshPiUsage = useAppStore((state) => state.refreshPiUsage)
  const recordFeatureInteraction = useAppStore((state) => state.recordFeatureInteraction)

  useEffect(() => {
    void fetchPiUsage()
  }, [fetchPiUsage])

  useEffect(() => {
    recordFeatureInteraction('usage-tracking')
  }, [recordFeatureInteraction])

  const title = translate('auto.components.stats.PiUsagePane.title', 'Pi Usage Tracking')

  if (!scanState?.enabled) {
    return (
      <UsageTrackingPaneShell
        enabled={false}
        title={title}
        disabledDescription={translate(
          'auto.components.stats.PiUsagePane.disabledDescription',
          'Reads local Pi session logs to show token, model, and session stats.'
        )}
        enableLabel={translate(
          'auto.components.stats.PiUsagePane.enableLabel',
          'Enable Pi usage analytics'
        )}
        onEnabledChange={(enabled) => {
          recordFeatureInteraction('usage-tracking')
          void setPiUsageEnabled(enabled)
        }}
      />
    )
  }

  if (!summary && (scanState.isScanning || scanState.lastScanCompletedAt === null)) {
    return (
      <ClaudeUsageLoadingState
        title={title}
        summaryCardCount={6}
        summaryGridClassName="md:grid-cols-3"
      />
    )
  }

  const hasAnyData = summary?.hasAnyPiData ?? scanState.hasAnyPiData

  return (
    <UsageTrackingPaneShell
      enabled
      title={title}
      status={
        <>
          {formatUpdatedAt(scanState.lastScanCompletedAt)}
          {scanState.lastScanError
            ? translate(
                'auto.components.stats.PiUsagePane.scanError',
                ' • Last scan error: {{value0}}',
                {
                  value0: scanState.lastScanError
                }
              )
            : ''}
        </>
      }
      isRefreshing={scanState.isScanning}
      hasData={hasAnyData}
      enableLabel={translate(
        'auto.components.stats.PiUsagePane.enableLabel',
        'Enable Pi usage analytics'
      )}
      optionsLabel={translate('auto.components.stats.PiUsagePane.optionsLabel', 'Pi usage options')}
      filtersLabel={translate('auto.components.stats.PiUsagePane.filtersLabel', 'Filters')}
      refreshAriaLabel={translate(
        'auto.components.stats.PiUsagePane.refreshAriaLabel',
        'Refresh Pi usage'
      )}
      refreshLabel={translate('auto.components.stats.PiUsagePane.refreshLabel', 'Refresh')}
      filterSections={[
        <UsageFilterRadioGroup
          key="range"
          label={translate('auto.components.stats.PiUsagePane.rangeLabel', 'Range')}
          value={range}
          options={RANGE_OPTIONS.map((value) => ({ value, label: RANGE_LABELS[value] }))}
          onValueChange={(value) => void setPiUsageRange(value as PiUsageRange)}
        />
      ]}
      selectionSummary={RANGE_LABELS[range]}
      emptyMessage={translate(
        'auto.components.stats.PiUsagePane.emptyMessage',
        'No local Pi usage found yet. Start using Pi to see statistics here.'
      )}
      onEnabledChange={(enabled) => {
        recordFeatureInteraction('usage-tracking')
        void setPiUsageEnabled(enabled)
      }}
      onRefresh={() => void refreshPiUsage()}
    >
      <>
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            label={translate('auto.components.stats.PiUsagePane.inputTokens', 'Input tokens')}
            value={formatTokens(summary?.inputTokens ?? 0)}
            icon={<Sparkles className="size-4" />}
          />
          <StatCard
            label={translate('auto.components.stats.PiUsagePane.outputTokens', 'Output tokens')}
            value={formatTokens(summary?.outputTokens ?? 0)}
            icon={<Activity className="size-4" />}
          />
          <StatCard
            label={translate('auto.components.stats.PiUsagePane.cachedInput', 'Cached input')}
            value={formatTokens(summary?.cachedInputTokens ?? 0)}
            icon={<DatabaseZap className="size-4" />}
          />
          <StatCard
            label={translate(
              'auto.components.stats.PiUsagePane.reasoningOutput',
              'Reasoning output'
            )}
            value={formatTokens(summary?.reasoningOutputTokens ?? 0)}
            icon={<Brain className="size-4" />}
          />
          <StatCard
            label={translate(
              'auto.components.stats.PiUsagePane.sessionsEvents',
              'Sessions / Events'
            )}
            value={`${(summary?.sessions ?? 0).toLocaleString()} / ${(summary?.events ?? 0).toLocaleString()}`}
            icon={<FolderKanban className="size-4" />}
          />
          <StatCard
            label={translate('auto.components.stats.PiUsagePane.recordedCost', 'Recorded cost')}
            value={formatCost(summary?.estimatedCostUsd ?? null)}
            icon={<Coins className="size-4" />}
          />
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          {translate(
            'auto.components.stats.PiUsagePane.costNote',
            'Cost comes from the Pi session logs when the assistant message recorded one.'
          )}
        </p>
        <p className="px-1 text-xs text-muted-foreground">
          {translate(
            'auto.components.stats.PiUsagePane.piNote',
            'Note: Pi usage is scanned from local session logs at ~/.pi/agent/sessions.'
          )}
        </p>

        <PiUsageDetails
          daily={daily}
          modelBreakdown={modelBreakdown}
          projectBreakdown={projectBreakdown}
          recentSessions={recentSessions}
          summary={summary}
        />
      </>
    </UsageTrackingPaneShell>
  )
}
