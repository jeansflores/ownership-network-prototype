import { NODE_HEIGHT, NODE_WIDTH } from './EntityNode'
import type { Adjacency } from './graph'

export interface Point {
  x: number
  y: number
}

export interface TreeEdge {
  from: string
  to: string
}

/** Top-down layers: one row per degree, rows ordered by the parent's column so edges stay short. */
export function layoutLayers(layers: string[][], parents: Map<string, string>): Map<string, Point> {
  const gapX = NODE_WIDTH + 40
  const gapY = NODE_HEIGHT + 120
  const widest = Math.max(...layers.map(l => l.length), 1)
  const positions = new Map<string, Point>()
  const columnOf = new Map<string, number>()

  layers.forEach((layer, depth) => {
    const ordered = [...layer].sort((a, b) => {
      const pa = columnOf.get(parents.get(a) ?? '') ?? Number.MAX_SAFE_INTEGER
      const pb = columnOf.get(parents.get(b) ?? '') ?? Number.MAX_SAFE_INTEGER
      return pa - pb
    })
    const offset = ((widest - ordered.length) * gapX) / 2
    ordered.forEach((id, index) => {
      columnOf.set(id, index)
      positions.set(id, { x: offset + index * gapX, y: depth * gapY })
    })
  })
  return positions
}

/** Concentric rings by depth from the root; each subtree gets an angular sector sized by its leaves. */
export function layoutRadial(
  root: string,
  visible: Set<string>,
  adjacency: Adjacency,
): Map<string, Point> {
  const children = new Map<string, string[]>()
  const depthOf = new Map<string, number>([[root, 0]])
  const queue = [root]
  while (queue.length > 0) {
    const current = queue.shift() as string
    const depth = depthOf.get(current) as number
    const next: string[] = []
    for (const { otherId } of adjacency.get(current) ?? []) {
      if (!visible.has(otherId) || depthOf.has(otherId)) continue
      depthOf.set(otherId, depth + 1)
      next.push(otherId)
      queue.push(otherId)
    }
    children.set(current, next)
  }

  const leaves = new Map<string, number>()
  const countLeaves = (id: string): number => {
    const kids = children.get(id) ?? []
    const total = kids.length === 0 ? 1 : kids.reduce((sum, kid) => sum + countLeaves(kid), 0)
    leaves.set(id, total)
    return total
  }
  countLeaves(root)

  const perRing = new Map<number, number>()
  for (const depth of depthOf.values()) perRing.set(depth, (perRing.get(depth) ?? 0) + 1)
  const radiusOf = (depth: number) => {
    const count = perRing.get(depth) ?? 1
    const needed = (count * (NODE_WIDTH + 40)) / (2 * Math.PI)
    return Math.max(depth * 300, needed)
  }

  const positions = new Map<string, Point>([[root, { x: -NODE_WIDTH / 2, y: -NODE_HEIGHT / 2 }]])
  const place = (id: string, start: number, end: number) => {
    const kids = children.get(id) ?? []
    const total = leaves.get(id) ?? 1
    let cursor = start
    for (const kid of kids) {
      const span = ((leaves.get(kid) ?? 1) / total) * (end - start)
      const angle = cursor + span / 2
      const radius = radiusOf(depthOf.get(kid) ?? 1)
      positions.set(kid, {
        x: Math.cos(angle) * radius - NODE_WIDTH / 2,
        y: Math.sin(angle) * radius - NODE_HEIGHT / 2,
      })
      place(kid, cursor, cursor + span)
      cursor += span
    }
  }
  place(root, -Math.PI / 2, (3 * Math.PI) / 2)
  return positions
}

/** Left-to-right columns; rows inside a column follow the given order, centred vertically. */
export function layoutColumns(columns: string[][]): Map<string, Point> {
  const gapX = 360
  const gapY = NODE_HEIGHT + 28
  const tallest = Math.max(...columns.map(c => c.length), 1)
  const positions = new Map<string, Point>()
  columns.forEach((column, columnIndex) => {
    const offset = ((tallest - column.length) * gapY) / 2
    column.forEach((id, rowIndex) => {
      positions.set(id, { x: columnIndex * gapX, y: offset + rowIndex * gapY })
    })
  })
  return positions
}
