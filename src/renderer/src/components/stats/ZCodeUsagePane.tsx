import { useEffect, useState } from 'react'
import { Activity, Brain, Coins, DatabaseZap, FolderKanban, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store'
import { ClaudeUsageLoadingState } from './ClaudeUsageLoadingState'
import { StatCard } from './StatCard'
import { UsageFilterRadioGroup, UsageTrackingPaneShell } from './UsageTrackingPaneShell'
import { formatCost, formatTokens, formatUpdatedAt } from './usage-formatters'
import { translate } from '@/i18n/i18n'

type ZCodeUsageRange = '7d' | '30d' | '90d' | 'all'

const RANGE_OPTIONS: ZCodeUsageRange[] = ['7d', '30d', '90d', 'all']
const RANGE_LABELS: Record<ZCodeUsageRange, string> = {
  get '7d'() {
    return translate('auto.components.stats.ZCodeUsagePane.rangeLast7Days', 'Last 7 days')
  },
  get '30d'() {
    return translate('auto.components.stats.ZCodeUsagePane.rangeLast30Days', 'Last 30 days')
  },
  get '90d'() {
    return translate('auto.components.stats.ZCodeUsagePane.rangeLast90Days', 'Last 90 days')
  },
  get all() {
    return translate('auto.components.stats.ZCodeUsagePane.rangeAllTime', 'All time')
  }
}

// Temporary stub implementation — real data will come from IPC
function useZCodeUsage(_range: ZCodeUsageRange) {
  const [state] = useState<{
    isLoading: boolean
    summary: {
      inputTokens: number
      outputTokens: number
      cachedInputTokens: number
      reasoningOutputTokens: number
      sessions: number
      events: number
      estimatedCostUsd: number | null
    } | null
  }>({ isLoading: false, summary: null })

  return state
}

export function ZCodeUsagePane(): React.JSX.Element {
  const [range, setRange] = useState<ZCodeUsageRange>('30d')
  const { isLoading, summary } = useZCodeUsage(range)
  const recordFeatureInteraction = useAppStore((state) => state.recordFeatureInteraction)

  useEffect(() => {
    recordFeatureInteraction('usage-tracking')
  }, [recordFeatureInteraction])

  const title = translate('auto.components.stats.ZCodeUsagePane.title', 'ZCode Usage Tracking')

  if (isLoading) {
    return (
      <ClaudeUsageLoadingState
        title={title}
        summaryCardCount={6}
        summaryGridClassName="md:grid-cols-3"
      />
    )
  }

  const hasAnyData = summary !== null && summary.sessions > 0

  return (
    <UsageTrackingPaneShell
      enabled
      title={title}
      status={formatUpdatedAt(null)}
      isRefreshing={false}
      hasData={hasAnyData}
      enableLabel={translate(
        'auto.components.stats.ZCodeUsagePane.enableLabel',
        'Enable ZCode usage analytics'
      )}
      optionsLabel={translate(
        'auto.components.stats.ZCodeUsagePane.optionsLabel',
        'ZCode usage options'
      )}
      filtersLabel={translate('auto.components.stats.ZCodeUsagePane.filtersLabel', 'Filters')}
      refreshAriaLabel={translate(
        'auto.components.stats.ZCodeUsagePane.refreshAriaLabel',
        'Refresh ZCode usage'
      )}
      refreshLabel={translate('auto.components.stats.ZCodeUsagePane.refreshLabel', 'Refresh')}
      filterSections={[
        <UsageFilterRadioGroup
          key="range"
          label={translate('auto.components.stats.ZCodeUsagePane.rangeLabel', 'Range')}
          value={range}
          options={RANGE_OPTIONS.map((value) => ({ value, label: RANGE_LABELS[value] }))}
          onValueChange={(value) => setRange(value as ZCodeUsageRange)}
        />
      ]}
      selectionSummary={RANGE_LABELS[range]}
      emptyMessage={translate(
        'auto.components.stats.ZCodeUsagePane.emptyMessage',
        'No local ZCode usage found yet. Start using ZCode to see statistics here.'
      )}
      onEnabledChange={(_enabled) => {
        recordFeatureInteraction('usage-tracking')
        // TODO: Implement setZCodeUsageEnabled IPC call
      }}
      onRefresh={() => {
        // TODO: Implement refreshZCodeUsage IPC call
      }}
    >
      <>
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            label={translate('auto.components.stats.ZCodeUsagePane.inputTokens', 'Input tokens')}
            value={formatTokens(summary?.inputTokens ?? 0)}
            icon={<Sparkles className="size-4" />}
          />
          <StatCard
            label={translate('auto.components.stats.ZCodeUsagePane.outputTokens', 'Output tokens')}
            value={formatTokens(summary?.outputTokens ?? 0)}
            icon={<Activity className="size-4" />}
          />
          <StatCard
            label={translate('auto.components.stats.ZCodeUsagePane.cachedInput', 'Cached input')}
            value={formatTokens(summary?.cachedInputTokens ?? 0)}
            icon={<DatabaseZap className="size-4" />}
          />
          <StatCard
            label={translate(
              'auto.components.stats.ZCodeUsagePane.reasoningOutput',
              'Reasoning output'
            )}
            value={formatTokens(summary?.reasoningOutputTokens ?? 0)}
            icon={<Brain className="size-4" />}
          />
          <StatCard
            label={translate(
              'auto.components.stats.ZCodeUsagePane.sessionsEvents',
              'Sessions / Events'
            )}
            value={`${(summary?.sessions ?? 0).toLocaleString()} / ${(summary?.events ?? 0).toLocaleString()}`}
            icon={<FolderKanban className="size-4" />}
          />
          <StatCard
            label={translate('auto.components.stats.ZCodeUsagePane.recordedCost', 'Recorded cost')}
            value={formatCost(summary?.estimatedCostUsd ?? null)}
            icon={<Coins className="size-4" />}
          />
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          {translate(
            'auto.components.stats.ZCodeUsagePane.costNote',
            'Cost comes from the local ZCode database when the assistant message recorded one.'
          )}
        </p>
        <p className="px-1 text-xs text-muted-foreground">
          {translate(
            'auto.components.stats.ZCodeUsagePane.zcodeNote',
            'Note: ZCode usage is tracked separately from OpenCode. ZCode uses its own database at ~/.zcode/cli/db/db.sqlite.'
          )}
        </p>
      </>
    </UsageTrackingPaneShell>
  )
}
