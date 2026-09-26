#!/usr/bin/env python3
"""Three-way semantic merge for the i18n locale JSON during an upstream sync.

Why this exists: the locale files are the single biggest conflict surface in a sync
(22 hunks across 6 files on 2026-09-26). Resolving them by keeping both sides of each
conflict marker is wrong twice over:

  1. The closing brace of the object usually sits in the shared suffix, so concatenating
     the two sides produces `Expecting ',' delimiter` with the line number pointing at
     end-of-file instead of the conflict.
  2. Both sides frequently add the *same* key with the same value at different positions
     (fork put `zcode_label` at the end, upstream next to `muse_label`). Keeping both sides
     emits duplicate JSON keys, which `json.load` silently accepts and the UI renders twice.

Merging per key avoids both. Formatting is preserved exactly: the repo's locale files are
byte-identical to `json.dumps(obj, indent=2, ensure_ascii=False) + "\\n"`, so rewriting the
whole file produces a diff containing only the added keys.

Must run BEFORE committing the merge — the `:1:`/`:2:`/`:3:` index stages only exist while
the merge is uncommitted. Afterwards use `<merge>^1` (fork) and `<merge>^2` (upstream).

Usage:  python3 merge-locales.py [--locales en,zh,es,fr,ja,ko] [--path-prefix DIR]
Exit 0 on success; exit 1 if any key was changed on both sides to different values,
after printing each one for a human decision.
"""

import argparse
import json
import subprocess
import sys
import collections

parser = argparse.ArgumentParser()
parser.add_argument('--locales', default='en,zh,es,fr,ja,ko')
parser.add_argument('--path-prefix', default='src/renderer/src/i18n/locales')
args = parser.parse_args()

conflicts = []


def show(stage, path):
    # `stage` is a full spec like ':1:' — do NOT append another separator, or git reads
    # ':1::path', finds nothing, and the merge silently degrades to "ours only".
    out = subprocess.run(
        ['git', 'show', f'{stage}{path}'], capture_output=True, text=True
    ).stdout
    return json.loads(out, object_pairs_hook=collections.OrderedDict) if out.strip() else None


def merge(ours, theirs, base, path, key):
    if isinstance(ours, dict) and isinstance(theirs, dict):
        out = collections.OrderedDict()
        for k, v in ours.items():
            if k in theirs:
                out[k] = merge(v, theirs[k], (base or {}).get(k), path, k)
            else:
                out[k] = v
        for k, v in theirs.items():
            if k not in out:
                out[k] = v
        return out
    if ours == theirs:
        return ours
    if base is not None and ours == base:
        return theirs
    if base is not None and theirs == base:
        return ours
    conflicts.append(f'{path} :: {key}\n    ours  ={ours!r}\n    theirs={theirs!r}\n    base  ={base!r}')
    return ours


for loc in args.locales.split(','):
    path = f'{args.path_prefix}/{loc}.json'
    base, ours, theirs = show(':1:', path), show(':2:', path), show(':3:', path)
    if base is None or ours is None or theirs is None:
        print(f'{loc}: 跳过（stage 读取为空——确认 merge 尚未提交，且该文件确实在冲突列表里）')
        continue
    merged = merge(ours, theirs, base, path, '<root>')
    text = json.dumps(merged, indent=2, ensure_ascii=False) + '\n'
    json.loads(text)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(text)
    print(f'{loc}: 已合并  base={len(base)} ours={len(ours)} theirs={len(theirs)} merged={len(merged)}')

if conflicts:
    print('\n=== 双方都改且值不同，需人工判定 ===')
    for c in conflicts:
        print(c)
    print('\n当前保留了 fork 的值。确认哪一侧正确后手工改，再重跑本脚本。')
    sys.exit(1)

print('\n无语义冲突，全部按键并集合并。')
print('接着跑 verify:localization-catalog 复核占位符一致性。')
