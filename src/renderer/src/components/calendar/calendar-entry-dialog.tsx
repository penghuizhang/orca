import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

import type {
  CalendarCategory,
  CalendarEntry,
  CalendarEntryCreateInput
} from '../../../../shared/calendar-types'
import { CALENDAR_CATEGORIES, isValidCalendarDate } from '../../../../shared/calendar-types'
import {
  CALENDAR_CATEGORY_DOT_CLASSES,
  CALENDAR_CATEGORY_LABEL_FALLBACKS
} from './calendar-category-display'
import { LUNAR_MONTH_NAMES, lunarToGregorianDate } from './lunar-date'
import { toDateKey, todayDateKey } from './calendar-time'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

type FormState = {
  title: string
  date: string
  allDay: boolean
  startTime: string
  endTime: string
  category: CalendarCategory
  description: string
  lunarRepeatEnabled: boolean
  lunarMonth: number
  lunarDay: number
}

function buildInitialForm(entry: CalendarEntry | null, defaultDate: string): FormState {
  return {
    title: entry?.title ?? '',
    date: entry?.date ?? defaultDate,
    allDay: entry?.allDay ?? false,
    startTime: entry?.startTime ?? '09:00',
    endTime: entry?.endTime ?? '10:00',
    category: entry?.category ?? 'meeting',
    description: entry?.description ?? '',
    lunarRepeatEnabled: entry?.lunarRepeat != null,
    lunarMonth: entry?.lunarRepeat?.month ?? 8,
    lunarDay: entry?.lunarRepeat?.day ?? 15
  }
}

export function CalendarEntryDialog({
  open,
  entry,
  defaultDate,
  isSaving,
  onOpenChange,
  onSave,
  onRequestDelete
}: {
  open: boolean
  /** null = create a new entry. */
  entry: CalendarEntry | null
  defaultDate: string
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CalendarEntryCreateInput) => void
  onRequestDelete: (entry: CalendarEntry) => void
}): React.JSX.Element {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(entry, defaultDate))

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(entry, defaultDate))
    }
  }, [open, entry, defaultDate])

  const canSave =
    form.title.trim().length > 0 &&
    (form.lunarRepeatEnabled ||
      (isValidCalendarDate(form.date) &&
        (form.allDay ||
          (/^\d{2}:\d{2}$/.test(form.startTime) &&
            /^\d{2}:\d{2}$/.test(form.endTime) &&
            form.endTime >= form.startTime))))

  const handleSave = (): void => {
    if (!canSave) {
      return
    }
    const lunarRepeat = form.lunarRepeatEnabled
      ? { month: form.lunarMonth, day: form.lunarDay }
      : null
    // Why: the entry keeps a Gregorian anchor date; lunar-repeat entries get
    // the current year's occurrence (fallback: today when the lunar day does
    // not exist this year, e.g. 腊月三十 in a 29-day 腊月).
    let date = form.date
    if (lunarRepeat) {
      const anchor = lunarToGregorianDate(
        new Date().getFullYear(),
        lunarRepeat.month,
        lunarRepeat.day,
        false
      )
      date = anchor ? toDateKey(anchor) : todayDateKey()
    }
    onSave({
      title: form.title.trim(),
      date,
      allDay: form.allDay,
      startTime: form.allDay ? null : form.startTime,
      endTime: form.allDay ? null : form.endTime,
      category: form.category,
      description: form.description.trim(),
      lunarRepeat
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {entry
              ? translate('auto.components.calendar.editEntry', 'Edit entry')
              : translate('auto.components.calendar.newEntry', 'New entry')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {entry
              ? translate(
                  'auto.components.calendar.editEntryDescription',
                  'Update this calendar entry.'
                )
              : translate(
                  'auto.components.calendar.newEntryDescription',
                  'Add an entry to your calendar.'
                )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label htmlFor="calendar-entry-title" className="text-xs">
              {translate('auto.components.calendar.title', 'Title')}
            </Label>
            <Input
              id="calendar-entry-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder={translate('auto.components.calendar.titlePlaceholder', 'What is it?')}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <Label htmlFor="calendar-entry-lunar-repeat" className="cursor-pointer text-xs">
              {translate('auto.components.calendar.lunarRepeat', 'Lunar date (repeats yearly)')}
            </Label>
            <Switch
              id="calendar-entry-lunar-repeat"
              checked={form.lunarRepeatEnabled}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, lunarRepeatEnabled: checked === true }))
              }
            />
          </div>

          {form.lunarRepeatEnabled ? (
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="calendar-entry-lunar-month" className="text-xs">
                  {translate('auto.components.calendar.lunarMonth', 'Lunar month')}
                </Label>
                <Select
                  value={String(form.lunarMonth)}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, lunarMonth: Number(value) }))
                  }
                >
                  <SelectTrigger id="calendar-entry-lunar-month" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LUNAR_MONTH_NAMES.map((name, index) => (
                      <SelectItem key={name} value={String(index + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="calendar-entry-lunar-day" className="text-xs">
                  {translate('auto.components.calendar.lunarDay', 'Lunar day')}
                </Label>
                <Select
                  value={String(form.lunarDay)}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, lunarDay: Number(value) }))
                  }
                >
                  <SelectTrigger id="calendar-entry-lunar-day" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="calendar-entry-date" className="text-xs">
                  {translate('auto.components.calendar.date', 'Date')}
                </Label>
                <Input
                  id="calendar-entry-date"
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="calendar-entry-category" className="text-xs">
                  {translate('auto.components.calendar.categoryLabel', 'Category')}
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, category: value as CalendarCategory }))
                  }
                >
                  <SelectTrigger id="calendar-entry-category" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALENDAR_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'size-2 rounded-full',
                              CALENDAR_CATEGORY_DOT_CLASSES[category]
                            )}
                          />
                          {translate(
                            `auto.components.calendar.category.${category}`,
                            CALENDAR_CATEGORY_LABEL_FALLBACKS[category]
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <Label htmlFor="calendar-entry-all-day" className="cursor-pointer text-xs">
              {translate('auto.components.calendar.allDay', 'All day')}
            </Label>
            <Switch
              id="calendar-entry-all-day"
              checked={form.allDay}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, allDay: checked === true }))
              }
            />
          </div>

          {!form.allDay ? (
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="calendar-entry-start" className="text-xs">
                  {translate('auto.components.calendar.startTime', 'Start')}
                </Label>
                <Input
                  id="calendar-entry-start"
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startTime: event.target.value }))
                  }
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="calendar-entry-end" className="text-xs">
                  {translate('auto.components.calendar.endTime', 'End')}
                </Label>
                <Input
                  id="calendar-entry-end"
                  type="time"
                  value={form.endTime}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endTime: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="calendar-entry-description" className="text-xs">
              {translate('auto.components.calendar.description', 'Description')}
            </Label>
            <Textarea
              id="calendar-entry-description"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          {entry ? (
            <Button
              variant="ghost"
              className="mr-auto text-destructive hover:text-destructive"
              onClick={() => onRequestDelete(entry)}
            >
              <Trash2 className="size-4" />
              {translate('auto.components.calendar.delete', 'Delete')}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate('auto.components.calendar.cancel', 'Cancel')}
          </Button>
          <Button disabled={!canSave || isSaving} onClick={handleSave}>
            {isSaving
              ? translate('auto.components.calendar.saving', 'Saving…')
              : translate('auto.components.calendar.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
