import type { GiteePull, RawGiteePull } from '../../shared/gitee-api'

// Why: Gitee reports merged PRs as state=closed with a non-null merged_at, and
// drafts carry state=open with draft=true — normalize both before mapping.
export function mapGiteePull(raw: RawGiteePull): GiteePull {
  const merged = raw.state === 'merged' || Boolean(raw.merged_at)
  const state = merged
    ? 'merged'
    : raw.state === 'open' && raw.draft
      ? 'draft'
      : raw.state === 'open'
        ? 'open'
        : 'closed'
  return {
    number: raw.number,
    title: raw.title ?? '',
    state,
    url: raw.html_url ?? '',
    draft: Boolean(raw.draft),
    mergeable: raw.mergeable ?? null,
    authorLogin: raw.user?.login ?? null,
    headRef: raw.head?.ref ?? null,
    baseRef: raw.base?.ref ?? null,
    updatedAt: raw.updated_at ?? null
  }
}
