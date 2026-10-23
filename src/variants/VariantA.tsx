// Variant A: the whole map, always, in horizontal bands per degree.
// Degree control only fades what is farther away; nothing is ever hidden.
import type { Edge, NodeMouseHandler } from '@xyflow/react'
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  ViewportPortal,
} from '@xyflow/react'
import { AutoComplete, Drawer, Input, Segmented, Switch, theme, Typography } from 'antd'
import type { FC } from 'react'
import { useMemo, useState } from 'react'
import styled from 'styled-components'

import { EntityDetails } from '../network/EntityDetails'
import { ExportMenu } from '../network/ExportMenu'
import type { EntityFlowNode } from '../network/EntityNode'
import { handlesFor, NODE_HEIGHT, NODE_WIDTH, nodeTypes } from '../network/EntityNode'
import { makeEdge } from '../network/flowEdges'
import { layoutLayers } from '../network/layouts'
import type { Network } from '../network/graph'
import { bfsDepths, bfsParents, buildAdjacency, entityById } from '../network/graph'
import { Icon } from '../network/Icon'
import type { VariantProps } from '../network/variantProps'

const { Text } = Typography

const Shell = styled.div`
  display: flex;
  height: 100%;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
`

const Rail = styled.div`
  width: 184px;
  flex: none;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`

const RailItem = styled.button<{ $active: boolean; $color: string }>`
  all: unset;
  cursor: pointer;
  padding: 16px 16px 16px 14px;
  border-left: 3px solid ${p => (p.$active ? p.$color : 'transparent')};
  border-bottom: 1px solid #f5f5f5;
  background: ${p => (p.$active ? '#fafafa' : 'transparent')};

  &:hover {
    background: #fafafa;
  }
`

const RailTitle = styled.div<{ $color: string }>`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${p => p.$color};
`

const RailCount = styled.div`
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
  color: #262626;
`

// The viewport portal paints after edges and nodes; a negative z-index sends the bands behind both.
const Band = styled.div<{ $color: string }>`
  position: absolute;
  z-index: -1;
  border-top: 1px dashed ${p => p.$color};
  background: ${p => p.$color}12;
  pointer-events: none;
`

const BandLabel = styled.div<{ $color: string }>`
  position: absolute;
  left: 12px;
  top: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.$color};
  white-space: nowrap;
`

const Legend = styled.div`
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #595959;
  background: #ffffffe6;
  padding: 6px 10px;
  border-radius: 6px;
`

const Swatch = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 6px;
  background: ${p => p.$color};
`

interface BandInfo {
  depth: number
  label: string
  ids: string[]
  companies: number
  people: number
}

const buildLayers = (network: Network, centralId: string) => {
  const adjacency = buildAdjacency(network)
  const reachable = bfsDepths(adjacency, [centralId])
  const maxDepth = Math.max(0, ...reachable.values())
  const otherRoots = network.entities
    .filter(e => !reachable.has(e.id) && (e.role === 'analyzed' || e.role === 'own'))
    .map(e => e.id)
  const unreachable = bfsDepths(adjacency, otherRoots)
  const depthOf = new Map<string, number>()
  for (const entity of network.entities) {
    const direct = reachable.get(entity.id)
    if (direct !== undefined) depthOf.set(entity.id, direct)
    else depthOf.set(entity.id, maxDepth + 1 + (unreachable.get(entity.id) ?? 0))
  }
  const parents = new Map<string, string>()
  for (const [id, parent] of bfsParents(adjacency, centralId)) parents.set(id, parent)
  for (const root of otherRoots)
    for (const [id, parent] of bfsParents(adjacency, root)) {
      if (!parents.has(id) && !reachable.has(id)) parents.set(id, parent)
    }

  const layers: string[][] = []
  for (const [id, depth] of depthOf) {
    const layer = layers[depth] ?? []
    layer.push(id)
    layers[depth] = layer
  }
  const byId = entityById(network)
  const bands: BandInfo[] = layers.map((ids, depth) => ({
    depth,
    label:
      depth === 0
        ? 'Casa consultada'
        : depth <= maxDepth
          ? `${depth}º grau`
          : depth === maxDepth + 1
            ? 'Demais casas da análise'
            : `Vínculos das demais (${depth - maxDepth - 1}º grau)`,
    ids,
    companies: ids.filter(id => byId.get(id)?.kind === 'company').length,
    people: ids.filter(id => byId.get(id)?.kind === 'person').length,
  }))
  return { adjacency, depthOf, parents, layers: layers.map(l => l ?? []), bands, maxDepth }
}

const Flow: FC<VariantProps> = ({ network, centralId, onCentralChange }) => {
  const { token } = theme.useToken()
  const { fitView } = useReactFlow()
  const byId = useMemo(() => entityById(network), [network])
  const model = useMemo(() => buildLayers(network, centralId), [network, centralId])
  const positions = useMemo(() => layoutLayers(model.layers, model.parents), [model])

  const [degreeLimit, setDegreeLimit] = useState<number | 'all'>('all')
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [showEnded, setShowEnded] = useState(true)
  const [search, setSearch] = useState('')

  const neighborsOfHovered = useMemo(() => {
    if (!hovered) return null
    const set = new Set<string>([hovered])
    for (const { otherId } of model.adjacency.get(hovered) ?? []) set.add(otherId)
    return set
  }, [hovered, model.adjacency])

  const isFaded = (id: string) => {
    const depth = model.depthOf.get(id) ?? 0
    const beyond = degreeLimit !== 'all' && depth > degreeLimit
    const notNeighbor = neighborsOfHovered !== null && !neighborsOfHovered.has(id)
    return beyond || notNeighbor
  }

  const nodes = useMemo<EntityFlowNode[]>(
    () =>
      network.entities.map(entity => ({
        id: entity.id,
        type: 'entity',
        position: positions.get(entity.id) ?? { x: 0, y: 0 },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        handles: handlesFor('vertical'),
        selected: entity.id === selected,
        data: {
          entity,
          degree: model.depthOf.get(entity.id) ?? 0,
          dimmed: isFaded(entity.id),
          highlighted: neighborsOfHovered?.has(entity.id) ?? false,
          conflict: network.conflictIds.has(entity.id),
          handles: 'vertical',
        },
      })),
        [network, positions, model, selected, neighborsOfHovered, degreeLimit],
  )

  const edges = useMemo<Edge[]>(
    () =>
      network.links
        .filter(link => showEnded || link.active)
        .map(link => {
          const touchesHovered = hovered === link.from || hovered === link.to
          const touchesSelected = selected === link.from || selected === link.to
          return makeEdge(link, {
            type: 'smoothstep',
            dimmed: isFaded(link.from) || isFaded(link.to) || (hovered !== null && !touchesHovered),
            emphasized: touchesHovered || touchesSelected,
            showLabel: touchesHovered || touchesSelected,
            color: token.colorTextTertiary,
            emphasizedColor: token.colorPrimary,
          })
        }),
        [network, hovered, selected, showEnded, degreeLimit, token],
  )

  const bandBoxes = useMemo(() => {
    const all = [...positions.values()]
    const minX = Math.min(...all.map(p => p.x)) - 260
    const maxX = Math.max(...all.map(p => p.x)) + NODE_WIDTH + 260
    return model.bands.map(band => {
      const ys = band.ids.map(id => positions.get(id)?.y ?? 0)
      const top = Math.min(...ys) - 44
      const bottom = Math.max(...ys) + NODE_HEIGHT + 44
      return { band, left: minX, width: maxX - minX, top, height: bottom - top }
    })
  }, [positions, model.bands])

  const bandColor = (depth: number) =>
    depth === 0
      ? token.colorPrimary
      : depth <= model.maxDepth
        ? ([token.colorInfo, token.colorSuccess, token.colorWarning, token.colorText][
            (depth - 1) % 4
          ] ?? token.colorInfo)
        : token.colorTextQuaternary

  const onNodeClick: NodeMouseHandler<EntityFlowNode> = (_, node) => setSelected(node.id)

  const searchOptions = network.entities
    .filter(e => search.length >= 2 && e.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8)
    .map(e => ({ value: e.id, label: `${e.name} · ${e.document}` }))

  const focusOn = (id: string) => {
    setSelected(id)
    void fitView({ nodes: [{ id }], duration: 500, maxZoom: 1.2 })
  }

  const selectedEntity = selected ? byId.get(selected) : undefined

  return (
    <Shell>
      <Rail>
        {model.bands.map(band => (
          <RailItem
            key={band.depth}
            $active={degreeLimit === band.depth}
            $color={bandColor(band.depth)}
            onClick={() => setDegreeLimit(degreeLimit === band.depth ? 'all' : band.depth)}>
            <RailTitle $color={bandColor(band.depth)}>{band.label}</RailTitle>
            <RailCount>{band.ids.length}</RailCount>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {band.companies} casas · {band.people} pessoas
            </Text>
          </RailItem>
        ))}
      </Rail>
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
          minZoom={0.05}
          maxZoom={2}
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={onNodeClick}
          onNodeMouseEnter={(_, node) => setHovered(node.id)}
          onNodeMouseLeave={() => setHovered(null)}
          onPaneClick={() => setSelected(null)}>
          <Background gap={24} color="#e8e8e8" />
          <ViewportPortal>
            {bandBoxes.map(({ band, left, width, top, height }) => (
              <Band
                key={band.depth}
                $color={bandColor(band.depth)}
                style={{ left, width, top, height }}>
                <BandLabel $color={bandColor(band.depth)}>
                  {band.label} · {band.ids.length}
                </BandLabel>
              </Band>
            ))}
          </ViewportPortal>
          <Panel position="top-left">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <AutoComplete
                options={searchOptions}
                value={search}
                onChange={setSearch}
                onSelect={(id: string) => {
                  setSearch('')
                  focusOn(id)
                }}
                style={{ width: 300 }}>
                <Input
                  allowClear
                  placeholder="Buscar casa ou pessoa"
                  prefix={<Icon name="IconSearch" />}
                />
              </AutoComplete>
              <Segmented
                value={String(degreeLimit)}
                onChange={value => setDegreeLimit(value === 'all' ? 'all' : Number(value))}
                options={[
                  { label: 'Tudo', value: 'all' },
                  ...Array.from({ length: Math.min(model.maxDepth, 4) }, (_, i) => ({
                    label: `Até ${i + 1}º`,
                    value: String(i + 1),
                  })),
                ]}
              />
              <Switch
                size="small"
                checked={showEnded}
                onChange={setShowEnded}
                checkedChildren="Encerrados"
                unCheckedChildren="Encerrados"
              />
              <ExportMenu title={`${byId.get(centralId)?.name ?? ''} · proposta A`} />
            </div>
          </Panel>
          <Panel position="bottom-right">
            <Legend>
              <span>
                <Swatch $color={token.colorPrimary} />
                Consultada
              </span>
              <span>
                <Swatch $color={token.colorSuccess} />
                Sua casa
              </span>
              <span>
                <Swatch $color={token.colorWarning} />
                Conflito
              </span>
              <span>
                <Swatch $color={token.colorError} />
                Lista restritiva
              </span>
              <span style={{ opacity: 0.6 }}>- - - vínculo encerrado</span>
            </Legend>
          </Panel>
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            pannable
            zoomable
            nodeColor={node =>
              network.conflictIds.has(node.id) ? token.colorWarning : token.colorBorder
            }
          />
        </ReactFlow>
        <Drawer
          open={selectedEntity !== undefined}
          onClose={() => setSelected(null)}
          getContainer={false}
          mask={false}
          size={380}
          title="Detalhes"
          styles={{ wrapper: { boxShadow: '-4px 0 16px rgba(0,0,0,0.08)' } }}>
          {selectedEntity && (
            <EntityDetails
              network={network}
              adjacency={model.adjacency}
              entity={selectedEntity}
              degree={model.depthOf.get(selectedEntity.id) ?? 0}
              onNavigate={focusOn}
              onFocus={selectedEntity.kind === 'company' ? onCentralChange : undefined}
            />
          )}
        </Drawer>
      </div>
    </Shell>
  )
}

export const VariantA: FC<VariantProps> = props => (
  <ReactFlowProvider>
    <Flow {...props} />
  </ReactFlowProvider>
)
