// Variant B: progressive exploration. Start from the consulted company,
// open one node at a time (or one whole degree at a time), re-centre on any node. Radial rings.
import type { Edge, NodeMouseHandler } from '@xyflow/react'
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import { Breadcrumb, Button, Card, Segmented, Space, theme, Typography } from 'antd'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'

import { EntityDetails } from '../network/EntityDetails'
import { ExportMenu } from '../network/ExportMenu'
import type { EntityFlowNode } from '../network/EntityNode'
import { handlesFor, NODE_HEIGHT, NODE_WIDTH, nodeTypes } from '../network/EntityNode'
import { makeEdge } from '../network/flowEdges'
import { layoutRadial } from '../network/layouts'
import { bfsDepths, buildAdjacency, entityById } from '../network/graph'
import { Icon } from '../network/Icon'
import type { VariantProps } from '../network/variantProps'

const { Text } = Typography

const Shell = styled.div`
  height: 100%;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
`

const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffffe6;
  padding: 10px 12px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
`

const Flow: FC<VariantProps> = ({ network, centralId, onCentralChange }) => {
  const { token } = theme.useToken()
  const { fitView } = useReactFlow()
  const byId = useMemo(() => entityById(network), [network])
  const adjacency = useMemo(() => buildAdjacency(network), [network])
  const depths = useMemo(() => bfsDepths(adjacency, [centralId]), [adjacency, centralId])
  const maxDepth = useMemo(() => Math.max(0, ...depths.values()), [depths])

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([centralId]))
  const [selected, setSelected] = useState<string | null>(null)
  const [trail, setTrail] = useState<string[]>([centralId])

  useEffect(() => {
    setExpanded(new Set([centralId]))
    setSelected(null)
    setTrail(previous => (previous.includes(centralId) ? previous : [...previous, centralId]))
  }, [centralId])

  // Visible = closure of the central node through every expanded node, plus their first neighbours.
  const visible = useMemo(() => {
    const set = new Set<string>([centralId])
    const queue = [centralId]
    while (queue.length > 0) {
      const current = queue.shift() as string
      if (!expanded.has(current)) continue
      for (const { otherId } of adjacency.get(current) ?? []) {
        if (set.has(otherId)) continue
        set.add(otherId)
        queue.push(otherId)
      }
    }
    return set
  }, [centralId, expanded, adjacency])

  useEffect(() => {
    const timer = window.setTimeout(
      () => void fitView({ padding: 0.2, duration: 400, maxZoom: 1 }),
      30,
    )
    return () => window.clearTimeout(timer)
  }, [visible, fitView])

  const positions = useMemo(
    () => layoutRadial(centralId, visible, adjacency),
    [centralId, visible, adjacency],
  )

  const hiddenCountOf = (id: string) =>
    (adjacency.get(id) ?? []).filter(({ otherId }) => !visible.has(otherId)).length

  const nodes = useMemo<EntityFlowNode[]>(
    () =>
      [...visible].map(id => {
        const entity = byId.get(id)
        if (!entity) throw new Error(`unknown entity ${id}`)
        return {
          id,
          type: 'entity' as const,
          position: positions.get(id) ?? { x: 0, y: 0 },
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          handles: handlesFor('center'),
          selected: id === selected,
          draggable: false,
          data: {
            entity,
            degree: depths.get(id) ?? 0,
            dimmed: false,
            highlighted: false,
            conflict: network.conflictIds.has(id),
            handles: 'center' as const,
            hiddenCount: hiddenCountOf(id),
            expanded: expanded.has(id),
            caption:
              id === centralId
                ? 'Casa consultada'
                : `${depths.get(id) ?? '?'}º grau · ${entity.document}`,
          },
        }
      }),
        [visible, positions, selected, expanded, depths, byId, network, centralId],
  )

  const edges = useMemo<Edge[]>(
    () =>
      network.links
        .filter(link => visible.has(link.from) && visible.has(link.to))
        .map(link => {
          const touchesSelected = selected === link.from || selected === link.to
          return makeEdge(link, {
            type: 'straight',
            dimmed: selected !== null && !touchesSelected,
            emphasized: touchesSelected,
            showLabel: touchesSelected,
            color:
              network.conflictIds.has(link.from) && network.conflictIds.has(link.to)
                ? token.colorWarning
                : token.colorTextTertiary,
            emphasizedColor: token.colorPrimary,
          })
        }),
    [network, visible, selected, token],
  )

  const toggle = (id: string) => {
    setExpanded(previous => {
      const next = new Set(previous)
      if (next.has(id) && id !== centralId) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandToDegree = (degree: number) => {
    const next = new Set<string>()
    for (const [id, depth] of depths) if (depth < degree) next.add(id)
    setExpanded(next)
  }

  const onNodeClick: NodeMouseHandler<EntityFlowNode> = (_, node) => {
    setSelected(node.id)
    toggle(node.id)
  }

  const onNodeDoubleClick: NodeMouseHandler<EntityFlowNode> = (_, node) => onCentralChange(node.id)

  const currentDegree = (() => {
    let deepest = 0
    for (const id of visible) deepest = Math.max(deepest, depths.get(id) ?? 0)
    return deepest
  })()

  const selectedEntity = selected ? byId.get(selected) : undefined

  return (
    <Shell>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.05}
        maxZoom={2}
        nodesConnectable={false}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={() => setSelected(null)}>
        <Background gap={24} color="#e8e8e8" />
        <Panel position="top-left">
          <Toolbar>
            <Breadcrumb
              items={trail.map(id => ({
                title: <a onClick={() => onCentralChange(id)}>{byId.get(id)?.name ?? id}</a>,
              }))}
            />
            <Space wrap>
              <Text type="secondary">Expandir até</Text>
              <Segmented
                value={currentDegree}
                onChange={value => expandToDegree(Number(value))}
                options={Array.from({ length: Math.min(maxDepth, 5) }, (_, i) => ({
                  label: `${i + 1}º grau`,
                  value: i + 1,
                }))}
              />
              <Button
                size="small"
                icon={<Icon name="IconArrowsMaximize" />}
                onClick={() => expandToDegree(maxDepth)}>
                Tudo
              </Button>
              <Button
                size="small"
                icon={<Icon name="IconArrowsMinimize" />}
                onClick={() => setExpanded(new Set([centralId]))}>
                Recolher
              </Button>
              <ExportMenu
                title={`${byId.get(centralId)?.name ?? ''} · proposta B`}
                network={network}
                centralId={centralId}
              />
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {visible.size} de {depths.size} entidades visíveis · clique abre, duplo clique
              centraliza
            </Text>
          </Toolbar>
        </Panel>
        {selectedEntity && (
          <Panel position="top-right">
            <Card
              size="small"
              style={{ width: 360, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}
              extra={
                <Button
                  type="text"
                  size="small"
                  icon={<Icon name="IconX" />}
                  onClick={() => setSelected(null)}
                />
              }
              title="Detalhes">
              <EntityDetails
                network={network}
                adjacency={adjacency}
                entity={selectedEntity}
                degree={depths.get(selectedEntity.id) ?? 0}
                onNavigate={id => {
                  setExpanded(previous => new Set(previous).add(selectedEntity.id))
                  setSelected(id)
                }}
                onFocus={onCentralChange}
              />
            </Card>
          </Panel>
        )}
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </Shell>
  )
}

export const VariantB: FC<VariantProps> = props => (
  <ReactFlowProvider>
    <Flow {...props} />
  </ReactFlowProvider>
)
