import { Pencil, Trash } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../../components/cx'

const ACTIONS_W = 144
const DRAG_START = 8

/**
 * List row you can swipe left to reveal Edit and Delete. Tapping the row also opens Edit, so the
 * actions stay reachable by keyboard and screen reader without swiping.
 */
export function SwipeRow({
  children,
  label,
  onEdit,
  onDelete,
}: {
  children: ReactNode
  label: string
  onEdit: () => void
  onDelete: () => void
}) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; base: number; id: number } | null>(null)
  const moved = useRef(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const open = offset !== 0 && !dragging

  // Tap anywhere else closes an open row.
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) setOffset(0)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div ref={rowRef} className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTIONS_W }} aria-hidden={!open}>
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            setOffset(0)
            onEdit()
          }}
          className="flex w-1/2 flex-col items-center justify-center gap-1 bg-surface-2 text-[12px] font-bold text-fg"
        >
          <Pencil size={18} aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            setOffset(0)
            onDelete()
          }}
          className="flex w-1/2 flex-col items-center justify-center gap-1 bg-flame text-[12px] font-extrabold text-on-accent"
        >
          <Trash size={18} aria-hidden="true" />
          Delete
        </button>
      </div>
      <button
        type="button"
        aria-label={label}
        className={cx(
          'relative flex w-full items-center gap-3 bg-surface px-4 py-3 text-left [touch-action:pan-y]',
          !dragging && 'transition-transform duration-200',
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, base: offset, id: e.pointerId }
          moved.current = false
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s || s.id !== e.pointerId) return
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          if (!moved.current) {
            if (Math.abs(dx) < DRAG_START || Math.abs(dx) < Math.abs(dy)) return
            moved.current = true
            setDragging(true)
            e.currentTarget.setPointerCapture(e.pointerId)
          }
          setOffset(Math.min(0, Math.max(-ACTIONS_W - 24, s.base + dx)))
        }}
        onPointerUp={() => {
          if (moved.current) {
            setOffset((o) => (o < -ACTIONS_W / 2 ? -ACTIONS_W : 0))
            setDragging(false)
          }
          start.current = null
        }}
        onPointerCancel={() => {
          start.current = null
          setDragging(false)
          setOffset((o) => (o < -ACTIONS_W / 2 ? -ACTIONS_W : 0))
        }}
        onClick={() => {
          if (moved.current) return
          if (offset !== 0) setOffset(0)
          else onEdit()
        }}
      >
        {children}
      </button>
    </div>
  )
}
