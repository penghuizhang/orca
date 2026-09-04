import type {
  PiUsageBreakdownRow,
  PiUsageDailyPoint,
  PiUsageSessionRow,
  PiUsageSummary
} from '../../../../shared/pi-usage-types'
import { CodexUsageDailyChart } from './CodexUsageDailyChart'
import { UsageBreakdownSection } from './UsageBreakdownSection'
import { UsageRecentSessionsTable } from './UsageRecentSessionsTable'
import { translate } from '@/i18n/i18n'

type PiUsageDetailsProps = {
  daily: PiUsageDailyPoint[]
  modelBreakdown: PiUsageBreakdownRow[]
  projectBreakdown: PiUsageBreakdownRow[]
  recentSessions: PiUsageSessionRow[]
  summary: PiUsageSummary | null | undefined
}

export function PiUsageDetails({
  daily,
  modelBreakdown,
  projectBreakdown,
  recentSessions,
  summary
}: PiUsageDetailsProps): React.JSX.Element {
  return (
    <>
      <CodexUsageDailyChart daily={daily} />

      <div className="grid gap-4 xl:grid-cols-2">
        <UsageBreakdownSection
          title={translate('auto.components.stats.PiUsagePane.byModel', 'By model')}
          topLabel={translate('auto.components.stats.PiUsagePane.topModel', 'Top model:')}
          topValue={summary?.topModel}
          rows={modelBreakdown.map((row) => ({
            key: row.key,
            label: row.label,
            tokens: row.totalTokens,
            sessions: row.sessions,
            eventsOrTurns: row.events,
            estimatedCostUsd: row.estimatedCostUsd
          }))}
          eventsOrTurns="events"
        />
        <UsageBreakdownSection
          title={translate('auto.components.stats.PiUsagePane.byProject', 'By project')}
          topLabel={translate('auto.components.stats.PiUsagePane.topProject', 'Top project:')}
          topValue={projectBreakdown[0]?.key}
          rows={projectBreakdown.map((row) => ({
            key: row.key,
            label: row.label,
            tokens: row.totalTokens,
            sessions: row.sessions,
            eventsOrTurns: row.events
          }))}
          eventsOrTurns="events"
        />
      </div>

      <UsageRecentSessionsTable
        title={translate('auto.components.stats.PiUsagePane.recentSessions', 'Recent sessions')}
        description={translate(
          'auto.components.stats.PiUsagePane.recentSessionsDescription',
          'Most recent local Pi sessions in this scope.'
        )}
        headings={[
          translate('auto.components.stats.PiUsagePane.lastActive', 'Last active'),
          translate('auto.components.stats.PiUsagePane.project', 'Project'),
          translate('auto.components.stats.PiUsagePane.model', 'Model'),
          translate('auto.components.stats.PiUsagePane.events', 'Events'),
          translate('auto.components.stats.PiUsagePane.input', 'Input'),
          translate('auto.components.stats.PiUsagePane.output', 'Output'),
          translate('auto.components.stats.PiUsagePane.total', 'Total')
        ]}
        unknownModel={translate('auto.components.stats.PiUsagePane.unknown', 'Unknown')}
        rows={recentSessions}
        getActivity={(row) => row.events}
        getTrailingTokens={(row) => row.totalTokens}
      />
    </>
  )
}
