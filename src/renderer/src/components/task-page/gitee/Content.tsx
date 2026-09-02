import { formatRelativeTime } from '../../task-page-source-context'
import { GiteeTasksBoard } from './GiteeTasksBoard'

export function GiteeContent(): React.JSX.Element {
  return <GiteeTasksBoard formatRelativeTime={formatRelativeTime} />
}
