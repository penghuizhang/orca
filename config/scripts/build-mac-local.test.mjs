import { describe, expect, it } from 'vitest'
import { createLocalBuildVersion, resolveVersionBase } from './build-mac-local.mjs'

describe('createLocalBuildVersion', () => {
  it('creates unique valid prerelease versions without changing the release base', () => {
    expect(createLocalBuildVersion('1.4.159-rc.0', 123456, 'abc123')).toBe(
      '1.4.159-rc.0.local.123456.abc123'
    )
    expect(createLocalBuildVersion('1.4.159', 123456, 'abc123')).toBe('1.4.159-local.123456.abc123')
  })

  it('sanitizes commit identifiers', () => {
    expect(createLocalBuildVersion('1.0.0', 1, 'abc/def')).toBe('1.0.0-local.1.abcdef')
  })
})

describe('resolveVersionBase', () => {
  it('prefers the newest final release tag over a lagging package version', () => {
    expect(resolveVersionBase('1.4.178-rc.2', ['v1.4.99', 'v1.4.196', 'v1.4.192-rc.1'])).toBe(
      '1.4.196'
    )
  })

  it('keeps package version when no tag is newer and skips prerelease tags', () => {
    expect(resolveVersionBase('1.4.196', ['v1.4.196', 'v1.4.197-rc.0'])).toBe('1.4.196')
    expect(resolveVersionBase('1.4.196', [])).toBe('1.4.196')
  })
})
