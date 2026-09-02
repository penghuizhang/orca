import React, { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import type { CalendarCategoryInfo, CalendarCategoryColor } from '../../../../shared/calendar-types'
import { CALENDAR_CATEGORY_COLORS } from '../../../../shared/calendar-types'
import { allCategoryInfos } from './calendar-category-display'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

/**
 * Manage user-defined calendar categories: add, rename, delete, recolor.
 * Built-ins are listed read-only.
 */
export function CalendarCategoryManagerDialog({
  open,
  categories,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete
}: {
  open: boolean
  categories: readonly CalendarCategoryInfo[]
  onOpenChange: (open: boolean) => void
  onCreate: (input: { name: string; color: CalendarCategoryColor }) => Promise<void>
  onUpdate: (id: string, updates: { name?: string; color?: CalendarCategoryColor }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [color, setColor] = useState<CalendarCategoryColor>(CALENDAR_CATEGORY_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const allCategories = allCategoryInfos(categories)

  const handleCreate = async (): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    try {
      await onCreate({ name: trimmed, color })
      setName('')
      setColor(CALENDAR_CATEGORY_COLORS[0])
    } catch {
      // error toast handled by the page
    }
  }

  const startRename = (info: CalendarCategoryInfo): void => {
    setEditingId(info.id)
    setEditingName(info.name)
  }

  const commitRename = async (info: CalendarCategoryInfo): Promise<void> => {
    const trimmed = editingName.trim()
    if (!trimmed) {
      return
    }
    try {
      await onUpdate(info.id, { name: trimmed, color: info.color as CalendarCategoryColor })
      setEditingId(null)
    } catch {
      // error toast handled by the page
    }
  }

  const pickColor = async (
    info: CalendarCategoryInfo,
    nextColor: CalendarCategoryColor
  ): Promise<void> => {
    await onUpdate(info.id, { color: nextColor })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {translate('auto.components.calendar.manageCategoriesTitle', 'Manage categories')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {translate(
              'auto.components.calendar.manageCategoriesDescription',
              'Add your own categories or rename the ones you created.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-sleek flex max-h-[40vh] flex-col gap-2 overflow-y-auto">
          {allCategories.map((info) => (
            <div
              key={info.id}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <span className={cn('size-2.5 shrink-0 rounded-full', info.color)} />
              {editingId === info.id ? (
                <Input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void commitRename(info)
                    } else if (event.key === 'Escape') {
                      setEditingId(null)
                    }
                  }}
                  className="h-7 flex-1 text-xs"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-[13px]">{info.name}</span>
              )}
              {info.builtIn ? (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {translate('auto.components.calendar.builtInCategory', 'Built-in')}
                </Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={translate('auto.components.calendar.renameCategory', 'Rename')}
                  onClick={() => startRename(info)}
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}
              {!info.builtIn ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={translate('auto.components.calendar.deleteCategory', 'Delete')}
                  onClick={() => void onDelete(info.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="space-y-1.5 border-t border-border pt-3">
          <Label htmlFor="calendar-new-category-name" className="text-xs">
            {translate('auto.components.calendar.newCategoryName', 'New category')}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="calendar-new-category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleCreate()
                }
              }}
              placeholder={translate(
                'auto.components.calendar.newCategoryPlaceholder',
                'e.g. 学习, 运维'
              )}
              className="h-8 flex-1 text-xs"
            />
            <div className="flex shrink-0 items-center gap-1">
              {CALENDAR_CATEGORY_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={swatch}
                  onClick={() => setColor(swatch)}
                  className={cn(
                    'size-5 rounded-full transition-transform',
                    swatch,
                    color === swatch && 'ring-2 ring-foreground ring-offset-1'
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {allCategories
                .filter((info) => !info.builtIn)
                .map((info) => (
                  <button
                    key={info.id}
                    type="button"
                    aria-label={translate(
                      'auto.components.calendar.pickCategoryColor',
                      'Pick color'
                    )}
                    title={info.name}
                    onClick={() => {
                      const next =
                        CALENDAR_CATEGORY_COLORS[
                          (CALENDAR_CATEGORY_COLORS.indexOf(info.color as CalendarCategoryColor) +
                            1) %
                            CALENDAR_CATEGORY_COLORS.length
                        ]
                      void pickColor(info, next)
                    }}
                    className={cn(
                      'size-5 rounded-full',
                      info.color,
                      'hover:ring-2 hover:ring-foreground'
                    )}
                  />
                ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {translate(
                'auto.components.calendar.pickColorHint',
                'Click a dot to change its color'
              )}
            </span>
          </div>
          <Button size="sm" className="mt-1 w-full" onClick={() => void handleCreate()}>
            <Plus className="size-4" />
            {translate('auto.components.calendar.addCategory', 'Add category')}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate('auto.components.calendar.cancel', 'Cancel')}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {translate('auto.components.calendar.done', 'Done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
