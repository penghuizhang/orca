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

  it('finds typescript method definition', () => {
    const content = 'sseChat(chatRequest): Promise<string> {\n  return this.call()\n}\n'
    const ranges = findSameFileDefinitionRanges(content, 'sseChat', 'typescript')
    expect(ranges).toHaveLength(1)
    expect(ranges[0].line).toBe(1)
  })

  it('finds typescript async/arrow method definition', () => {
    const content = 'async sseChat(req: Req) {\n  const fn = sseChat\n}\n'
    const ranges = findSameFileDefinitionRanges(content, 'sseChat', 'typescript')
    expect(ranges).toHaveLength(1)
    expect(ranges[0].line).toBe(1)
  })

  it('ignores member-access call site in same file', () => {
    const content = 'chatService.sseChat(req)\nconst y = sseChat(req)\n'
    const ranges = findSameFileDefinitionRanges(content, 'sseChat', 'typescript')
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

  it('detects method/arrow declarations', () => {
    expect(
      isDefinitionLine('sseChat(chatRequest): Promise<string> {', 'sseChat', 'typescript')
    ).toBe(true)
    expect(isDefinitionLine('async sseChat(req) {', 'sseChat', 'typescript')).toBe(true)
    expect(isDefinitionLine('const sseChat = (req) => {', 'sseChat', 'typescript')).toBe(true)
    expect(isDefinitionLine('sseChat: (req) => {', 'sseChat', 'typescript')).toBe(true)
    expect(isDefinitionLine('interface Chat { sseChat(req): void }', 'sseChat', 'typescript')).toBe(
      true
    )
  })

  it('excludes call sites', () => {
    expect(isDefinitionLine('chatService.sseChat(req)', 'sseChat', 'typescript')).toBe(false)
    expect(isDefinitionLine('const y = sseChat(req)', 'sseChat', 'typescript')).toBe(false)
    expect(isDefinitionLine('return sseChat(req)', 'sseChat', 'typescript')).toBe(false)
    expect(isDefinitionLine('foo(sseChat(req))', 'sseChat', 'typescript')).toBe(false)
    expect(isDefinitionLine('await sseChat(req)', 'sseChat', 'typescript')).toBe(false)
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

  it('prefers a method declaration over an alphabetically-earlier usage file', () => {
    const files = [
      {
        filePath: '/aaa.ts',
        relativePath: 'aaa.ts',
        matches: [{ line: 5, column: 1, matchLength: 3, lineContent: 'const y = foo(req)' }]
      },
      {
        filePath: '/zzz.ts',
        relativePath: 'zzz.ts',
        matches: [
          { line: 2, column: 1, matchLength: 3, lineContent: 'foo(chatRequest): Promise<void> {' }
        ]
      }
    ]
    const ranked = rankSearchMatches('foo', files, 'typescript')
    expect(ranked[0].filePath).toBe('/zzz.ts')
    expect(ranked[0].isDefinition).toBe(true)
  })
})
