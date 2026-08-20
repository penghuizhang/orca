import { describe, expect, it } from 'vitest'
import {
  findSameFileDefinitionRanges,
  rankSearchMatches,
  isDefinitionLine
} from './code-navigation'

describe('findSameFileDefinitionRanges', () => {
  it('finds typescript function definition', () => {
    const content = 'function foo() {}\nconst x = foo()\n'
    const ranges = findSameFileDefinitionRanges(content, 'foo', 'typescript')
    expect(ranges).toHaveLength(1)
    expect(ranges[0].line).toBe(1)
  })

  it('ignores non-definition usage', () => {
    const content = 'const x = foo()\nconst y = foo()\n'
    const ranges = findSameFileDefinitionRanges(content, 'foo', 'typescript')
    expect(ranges).toHaveLength(0)
  })

  it('finds python def', () => {
    const content = 'def foo():\n  pass\nx = foo()\n'
    const ranges = findSameFileDefinitionRanges(content, 'foo', 'python')
    expect(ranges).toHaveLength(1)
    expect(ranges[0].line).toBe(1)
  })

  it('returns empty for missing word', () => {
    expect(findSameFileDefinitionRanges('', 'foo', 'typescript')).toEqual([])
    expect(findSameFileDefinitionRanges('content', '', 'typescript')).toEqual([])
  })
})

describe('isDefinitionLine', () => {
  it('detects definition line', () => {
    expect(isDefinitionLine('function foo() {', 'foo', 'typescript')).toBe(true)
    expect(isDefinitionLine('const foo = 1', 'foo', 'typescript')).toBe(true)
    expect(isDefinitionLine('const x = foo()', 'foo', 'typescript')).toBe(false)
  })
})

describe('rankSearchMatches', () => {
  it('prefers definition lines', () => {
    const files = [
      {
        filePath: '/a.ts',
        relativePath: 'a.ts',
        matches: [{ line: 1, column: 1, matchLength: 3, lineContent: 'const x = foo()' }]
      },
      {
        filePath: '/b.ts',
        relativePath: 'b.ts',
        matches: [{ line: 1, column: 1, matchLength: 3, lineContent: 'function foo() {}' }]
      }
    ]
    const ranked = rankSearchMatches('foo', files, 'typescript')
    expect(ranked[0].filePath).toBe('/b.ts')
    expect(ranked[0].isDefinition).toBe(true)
  })

  it('excludes current file', () => {
    const files = [
      {
        filePath: '/a.ts',
        relativePath: 'a.ts',
        matches: [{ line: 1, column: 1, matchLength: 3, lineContent: 'function foo() {}' }]
      }
    ]
    const ranked = rankSearchMatches('foo', files, 'typescript', '/a.ts')
    expect(ranked).toHaveLength(0)
  })
})
