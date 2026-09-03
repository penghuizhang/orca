import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CalendarPersistence } from './calendar-persistence'
import type { StoreRuntimeState } from './store-runtime-state'
import type { WriteSchedulingOperations } from './write-scheduling'

describe('CalendarPersistence boot order', () => {
  it('constructs before runtime.state is assigned (Store creates domains first)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'orca-calendar-boot-'))
    const runtime = { dataFile: join(dir, 'orca-data.json'), state: undefined }
    const scheduling = {}
    expect(
      () =>
        new CalendarPersistence(
          runtime as unknown as StoreRuntimeState,
          scheduling as unknown as WriteSchedulingOperations
        )
    ).not.toThrow()
  })
})
