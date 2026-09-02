import { describe, expect, it } from 'vitest'
import { getRepoBackedTaskEmptyState } from './task-page-empty-state'

describe('getRepoBackedTaskEmptyState', () => {
  it('explains when no repo-backed task source is selected', () => {
    expect(
      getRepoBackedTaskEmptyState({
        provider: 'github',
        selectedRepoCount: 0
      })
    ).toEqual({
      title: 'No project sources selected',
      description:
        'Select at least one project source so Orca knows which host/account to fetch tasks from.'
    })
  })

  it('points to adding a workspace when the app has no workspace at all', () => {
    expect(
      getRepoBackedTaskEmptyState({
        provider: 'github',
        selectedRepoCount: 0,
        hasNoWorkspace: true
      })
    ).toEqual({
      title: 'No workspace yet',
      description: 'Add a workspace (a git repository) to start browsing tasks.'
    })
    expect(
      getRepoBackedTaskEmptyState({
        provider: 'gitlab',
        selectedRepoCount: 0,
        gitlabView: 'mrs',
        hasNoWorkspace: true
      })
    ).toEqual({
      title: 'No workspace yet',
      description: 'Add a workspace (a git repository) to start browsing tasks.'
    })
  })

  it('keeps GitHub no-match copy when sources are selected', () => {
    expect(
      getRepoBackedTaskEmptyState({
        provider: 'github',
        selectedRepoCount: 2
      })
    ).toEqual({
      title: 'No matching GitHub work',
      description: 'Change the query or clear it.'
    })
  })

  it('uses GitLab view-specific no-match copy when sources are selected', () => {
    expect(
      getRepoBackedTaskEmptyState({
        provider: 'gitlab',
        selectedRepoCount: 1,
        gitlabView: 'mrs'
      })
    ).toEqual({
      title: 'No GitLab merge requests',
      description: 'No GitLab MRs match this filter.'
    })
  })
})
