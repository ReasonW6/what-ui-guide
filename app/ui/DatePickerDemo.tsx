"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import "./date-picker-demo.css";

type DatePickerSettings = {
  weekStartsOn: 0 | 1;
  cellSize: number;
  showWeekNumbers: boolean;
};

type DatePickerDemoProps = {
  density: "card" | "detail";
  settings?: Partial<DatePickerSettings>;
};

type CalendarDay = {
  date: Date;
  key: string;
  inMonth: boolean;
};

const INITIAL_MONTH = new Date(2026, 6, 1);
const INITIAL_SELECTION = new Date(2026, 6, 14);
const DEMO_TODAY_KEY = "2026-07-21";

const pad = (value: number) => String(value).padStart(2, "0");

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function startOfCalendar(month: Date, weekStartsOn: 0 | 1) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (firstDay.getDay() - weekStartsOn + 7) % 7;
  return addDays(firstDay, -offset);
}

function calendarDays(month: Date, weekStartsOn: 0 | 1): CalendarDay[] {
  const start = startOfCalendar(month, weekStartsOn);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return { date, key: dateKey(date), inMonth: sameMonth(date, month) };
  });
}

function isoWeekNumber(date: Date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const monthFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
});

const spokenDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

export function DatePickerDemo({ density, settings }: DatePickerDemoProps) {
  const fieldId = useId();
  const dialogId = useId();
  const gridId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const shouldFocusGrid = useRef(false);
  const [open, setOpen] = useState(density === "detail");
  const [visibleMonth, setVisibleMonth] = useState(INITIAL_MONTH);
  const [selectedDate, setSelectedDate] = useState(INITIAL_SELECTION);
  const [focusedDate, setFocusedDate] = useState(INITIAL_SELECTION);

  const weekStartsOn = settings?.weekStartsOn ?? 1;
  const showWeekNumbers = settings?.showWeekNumbers ?? false;
  const cellSize = Math.max(
    32,
    Math.min(56, Math.round(settings?.cellSize ?? (density === "detail" ? 42 : 36))),
  );
  const days = useMemo(
    () => calendarDays(visibleMonth, weekStartsOn),
    [visibleMonth, weekStartsOn],
  );
  const weeks = useMemo(
    () => Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7)),
    [days],
  );
  const weekdayLabels = weekStartsOn === 1
    ? ["一", "二", "三", "四", "五", "六", "日"]
    : ["日", "一", "二", "三", "四", "五", "六"];
  const style = { "--date-picker-cell-size": `${cellSize}px` } as CSSProperties;

  useEffect(() => {
    if (!open || !shouldFocusGrid.current) return;
    shouldFocusGrid.current = false;
    requestAnimationFrame(() => dayRefs.current.get(dateKey(focusedDate))?.focus());
  }, [focusedDate, open, visibleMonth]);

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openCalendar = () => {
    const nextFocus = selectedDate;
    setVisibleMonth(new Date(nextFocus.getFullYear(), nextFocus.getMonth(), 1));
    setFocusedDate(nextFocus);
    shouldFocusGrid.current = true;
    setOpen(true);
  };

  const moveFocus = (nextDate: Date) => {
    shouldFocusGrid.current = true;
    setFocusedDate(nextDate);
    if (!sameMonth(nextDate, visibleMonth)) {
      setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    }
  };

  const moveMonth = (amount: number, focusGrid = true) => {
    const nextMonth = addMonths(visibleMonth, amount);
    const nextDay = Math.min(
      focusedDate.getDate(),
      new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate(),
    );
    const nextDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextDay);
    if (focusGrid) {
      moveFocus(nextDate);
    } else {
      setFocusedDate(nextDate);
      setVisibleMonth(nextMonth);
    }
  };

  const select = (date: Date) => {
    setSelectedDate(date);
    setFocusedDate(date);
    close(true);
  };

  const handleDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    let nextDate: Date | undefined;
    switch (event.key) {
      case "ArrowLeft":
        nextDate = addDays(date, -1);
        break;
      case "ArrowRight":
        nextDate = addDays(date, 1);
        break;
      case "ArrowUp":
        nextDate = addDays(date, -7);
        break;
      case "ArrowDown":
        nextDate = addDays(date, 7);
        break;
      case "Home":
        nextDate = addDays(date, -((date.getDay() - weekStartsOn + 7) % 7));
        break;
      case "End":
        nextDate = addDays(date, 6 - ((date.getDay() - weekStartsOn + 7) % 7));
        break;
      case "PageUp":
        event.preventDefault();
        moveMonth(-1);
        return;
      case "PageDown":
        event.preventDefault();
        moveMonth(1);
        return;
      case "Escape":
        event.preventDefault();
        close(true);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        select(date);
        return;
      default:
        return;
    }
    event.preventDefault();
    moveFocus(nextDate);
  };

  return (
    <div
      className={`date-picker-demo date-picker-demo--${density}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          close(true);
        }
      }}
      style={style}
    >
      <label className="date-picker-label" htmlFor={fieldId}>选择日期</label>
      <div className="date-picker-field-shell">
        <input
          data-demo-part="1"
          id={fieldId}
          onChange={(event) => {
            const [year, month, day] = event.target.value.split("-").map(Number);
            if (!year || !month || !day) return;
            const nextDate = new Date(year, month - 1, day);
            setSelectedDate(nextDate);
            setFocusedDate(nextDate);
            setVisibleMonth(new Date(year, month - 1, 1));
          }}
          type="date"
          value={dateKey(selectedDate)}
        />
        <button
          aria-controls={dialogId}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={open ? "关闭日期日历" : "打开日期日历"}
          className="date-picker-trigger"
          data-demo-part="2"
          onClick={() => open ? close() : openCalendar()}
          ref={triggerRef}
          type="button"
        >
          <span aria-hidden="true" className="date-picker-trigger-icon" />
        </button>
      </div>

      {open && (
        <div
          aria-label="选择日期"
          className="date-picker-popover"
          id={dialogId}
          role="dialog"
        >
          <div className="date-picker-month-bar">
            <strong aria-live="polite">{monthFormatter.format(visibleMonth)}</strong>
            <div>
              <button
                aria-label="上个月"
                className="date-picker-month-button"
                onClick={() => moveMonth(-1, false)}
                type="button"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                aria-label="下个月"
                className="date-picker-month-button"
                onClick={() => moveMonth(1, false)}
                type="button"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>

          <div className="date-picker-grid-wrap" data-demo-part="3">
            <table
              aria-label={monthFormatter.format(visibleMonth)}
              className="date-picker-grid"
              id={gridId}
              role="grid"
            >
              <thead>
                <tr>
                  {showWeekNumbers && <th aria-label="周数" scope="col">周</th>}
                  {weekdayLabels.map((label) => <th key={label} scope="col">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week[0].key}>
                    {showWeekNumbers && (
                      <th className="date-picker-week-number" scope="row">
                        {isoWeekNumber(week[0].date)}
                      </th>
                    )}
                    {week.map((day) => {
                      const selected = day.key === dateKey(selectedDate);
                      const today = day.key === DEMO_TODAY_KEY;
                      const focused = day.key === dateKey(focusedDate);
                      return (
                        <td aria-selected={selected} key={day.key} role="gridcell">
                          <button
                            aria-current={today ? "date" : undefined}
                            aria-label={`${spokenDateFormatter.format(day.date)}${today ? "，今天" : ""}${selected ? "，已选择" : ""}`}
                            className={[
                              "date-picker-day",
                              day.inMonth ? "" : "is-outside",
                              selected ? "is-selected" : "",
                              today ? "is-today" : "",
                            ].filter(Boolean).join(" ")}
                            onClick={() => select(day.date)}
                            onFocus={() => setFocusedDate(day.date)}
                            onKeyDown={(event) => handleDayKeyDown(event, day.date)}
                            ref={(node) => {
                              if (node) dayRefs.current.set(day.key, node);
                              else dayRefs.current.delete(day.key);
                            }}
                            tabIndex={focused ? 0 : -1}
                            type="button"
                          >
                            {day.date.getDate()}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="date-picker-help">方向键移动 · Enter 选择 · Esc 关闭</p>
        </div>
      )}
    </div>
  );
}
