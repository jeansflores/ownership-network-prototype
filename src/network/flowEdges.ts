import type { Edge } from '@xyflow/react'
import { MarkerType } from '@xyflow/react'

import type { NetworkLink } from './graph'
import { RELATION_LABEL } from './graph'

export interface EdgeOptions {
  type: 'smoothstep' | 'straight' | 'default'
  dimmed: boolean
  emphasized: boolean
  showLabel: boolean
  color: string
  emphasizedColor: string
}

export function makeEdge(link: NetworkLink, options: EdgeOptions): Edge {
  const stroke = options.emphasized ? options.emphasizedColor : options.color
  const label = options.showLabel
    ? link.share !== undefined
      ? `${RELATION_LABEL[link.relation]} · ${link.share}%`
      : RELATION_LABEL[link.relation]
    : undefined

  const edge: Edge = {
    id: link.id,
    source: link.from,
    target: link.to,
    type: options.type,
    animated: options.emphasized,
    markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 18, height: 18 },
    style: {
      stroke,
      strokeWidth: options.emphasized ? 3 : 2,
      // Keeps the line readable when a 250-node map is zoomed far out.
      vectorEffect: 'non-scaling-stroke',
      strokeDasharray: link.active ? undefined : '8 5',
      opacity: options.dimmed ? 0.12 : link.active ? 1 : 0.6,
    },
    labelStyle: { fontSize: 11, fill: '#595959' },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
  }
  if (label !== undefined) edge.label = label
  return edge
}
