// Variant C: conflict columns. Your company on the left, the analysed
// suppliers in the middle, everything else fanning out to the right; a path finder between any
// two entities and a navigable list on the side.
import type { Edge, NodeMouseHandler } from '@xyflow/react'
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import { Button, Collapse, Input, Select, Space, Switch, Tag, theme, Typography } from 'antd'
import type { FC } from 'react'
import { useMemo, useState } from 'react'
import styled from 'styled-components'

import { EntityDetails } from '../network/EntityDetails'
import { ExportMenu } from '../network/ExportMenu'
import type { EntityFlowNode } from '../network/EntityNode'
import { handlesFor, NODE_HEIGHT, NODE_WIDTH, nodeTypes } from '../network/EntityNode'
import { makeEdge } from '../network/flowEdges'
import { layoutColumns } from '../network/layouts'
import type { NetworkEntity } from '../network/graph'
import { bfsDepths, buildAdjacency, entityById, shortestPath } from '../network/graph'
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

const Side = styled.div`
  width: 340px;
  flex: none;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  min-height: 0;
`

const SideHeader = styled.div`
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SideBody = styled.div`
  flex: 1;
  overflow-y: auto;
`

const ListRow = styled.button<{ $active: boolean }>`
  all: unset;
  display: flex;
  align-items: center;
  gap: 8px;
  width: calc(100% - 24px);
  padding: 6px 12px;
  cursor: pointer;
  background: ${p => (p.$active ? '#e6f4ff' : 'transparent')};

  &:hover {
    background: #f5f5f5;
  }
`

const ColumnHeader = styled.div`
  position: absolute;
  top: -40px;
  width: ${NODE_WIDTH}px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8c8c8c;
`

const COLUMN_LABELS = [
  'Sua casa',
  'Vínculos diretos seus',
  'Casas analisadas',
  'Membros das analisadas',
  'Outras casas',
  'Membros dessas',
  '4º grau',
  '5º grau',
]

const Flow: FC<VariantProps> = ({ network, centralId, onCentralChange }) => {
  const { token } = theme.useToken()
  const { fitView } = useReactFlow()
  const byId = useMemo(() => entityById(network), [network])
  const adjacency = useMemo(() => buildAdjacency(network), [network])

  const columns = useMemo(() => {
    const fromOwn = bfsDepths(adjacency, [network.ownId])
    const analyzedIds = network.entities.filter(e => e.role === 'analyzed').map(e => e.id)
    const fromAnalyzed = bfsDepths(adjacency, analyzedIds)
    const columnOf = new Map<string, number>()
    for (const entity of network.entities) {
      const own = fromOwn.get(entity.id)
      const analyzed = fromAnalyzed.get(entity.id)
      const candidates = [own, analyzed === undefined ? undefined : analyzed + 2].filter(
        (value): value is number => value !== undefined,
      )
      const column = entity.role === 'analyzed' ? 2 : Math.min(...candidates, 7)
      columnOf.set(entity.id, column)
    }
    const groups: string[][] = []
    for (const [id, column] of columnOf) {
      const group = groups[column] ?? []
      group.push(id)
      groups[column] = group
    }
    const weight = (id: string) => {
      const entity = byId.get(id) as NetworkEntity
      const conflict = network.conflictIds.has(id) ? 0 : 1
      const central = id === centralId ? 0 : 1
      return `${central}${conflict}${entity.name}`
    }
    return {
      columnOf,
      groups: groups.map(g => (g ?? []).sort((a, b) => weight(a).localeCompare(weight(b)))),
    }
  }, [network, adjacency, byId, centralId])

  const positions = useMemo(() => layoutColumns(columns.groups), [columns])

  const [selected, setSelected] = useState<string | null>(null)
  const [pathFrom, setPathFrom] = useState<string>(network.ownId)
  const [pathTo, setPathTo] = useState<string>(centralId)
  const [pathActive, setPathActive] = useState(false)
  const [onlyConflicts, setOnlyConflicts] = useState(false)
  const [filter, setFilter] = useState('')

  const path = useMemo(
    () => (pathActive ? shortestPath(adjacency, pathFrom, pathTo) : null),
    [pathActive, adjacency, pathFrom, pathTo],
  )
  const pathSet = useMemo(() => new Set(path ?? []), [path])
  const pathEdges = useMemo(() => {
    const set = new Set<string>()
    if (!path) return set
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]
      const b = path[i + 1]
      for (const { link } of adjacency.get(a ?? '') ?? []) {
        if (link.from === b || link.to === b) set.add(link.id)
      }
    }
    return set
  }, [path, adjacency])

  const isFaded = (id: string) => {
    if (pathActive && path && !pathSet.has(id)) return true
    if (onlyConflicts) {
      const entity = byId.get(id)
      const keep =
        network.conflictIds.has(id) || entity?.role !== 'other'
          ? true
          : (adjacency.get(id) ?? []).some(({ otherId }) => network.conflictIds.has(otherId))
      return !keep
    }
    return false
  }

  const nodes = useMemo<EntityFlowNode[]>(
    () =>
      network.entities.map(entity => ({
        id: entity.id,
        type: 'entity' as const,
        position: positions.get(entity.id) ?? { x: 0, y: 0 },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        handles: handlesFor('horizontal'),
        selected: entity.id === selected,
        data: {
          entity,
          degree: entity.id === centralId ? 0 : (columns.columnOf.get(entity.id) ?? 1),
          dimmed: isFaded(entity.id),
          highlighted: pathSet.has(entity.id),
          conflict: network.conflictIds.has(entity.id),
          handles: 'horizontal' as const,
        },
      })),
        [network, positions, selected, pathSet, onlyConflicts, columns, centralId],
  )

  const edges = useMemo<Edge[]>(
    () =>
      network.links.map(link => {
        const onPath = pathEdges.has(link.id)
        const touchesSelected = selected === link.from || selected === link.to
        const conflictEdge = network.conflictIds.has(link.from) || network.conflictIds.has(link.to)
        return makeEdge(link, {
          type: 'smoothstep',
          dimmed:
            isFaded(link.from) ||
            isFaded(link.to) ||
            (selected !== null && !touchesSelected && !onPath),
          emphasized: onPath || touchesSelected,
          showLabel: true,
          color: conflictEdge ? token.colorWarning : token.colorTextTertiary,
          emphasizedColor: onPath ? token.colorWarning : token.colorPrimary,
        })
      }),
        [network, pathEdges, selected, onlyConflicts, pathSet, token],
  )

  const focusOn = (id: string) => {
    setSelected(id)
    void fitView({ nodes: [{ id }], duration: 500, maxZoom: 1.1 })
  }

  const onNodeClick: NodeMouseHandler<EntityFlowNode> = (_, node) => setSelected(node.id)

  const entityOptions = network.entities.map(e => ({
    value: e.id,
    label: `${e.name} · ${e.document}`,
  }))

  const selectedEntity = selected ? byId.get(selected) : undefined
  const filterLower = filter.toLowerCase()

  return (
    <Shell>
      <Side>
        <SideHeader>
          <Text strong>Buscar conexão</Text>
          <Select
            showSearch
            optionFilterProp="label"
            value={pathFrom}
            onChange={setPathFrom}
            options={entityOptions}
            placeholder="De"
          />
          <Select
            showSearch
            optionFilterProp="label"
            value={pathTo}
            onChange={setPathTo}
            options={entityOptions}
            placeholder="Até"
          />
          <Space>
            <Button
              type={pathActive ? 'default' : 'primary'}
              size="small"
              icon={<Icon name="IconRoute" />}
              onClick={() => setPathActive(active => !active)}>
              {pathActive ? 'Limpar caminho' : 'Traçar caminho'}
            </Button>
            {pathActive && (
              <Tag color={path ? 'warning' : 'default'}>
                {path ? `${path.length - 1} salto(s)` : 'Sem conexão'}
              </Tag>
            )}
          </Space>
          <Space>
            <Switch size="small" checked={onlyConflicts} onChange={setOnlyConflicts} />
            <Text style={{ fontSize: 12 }}>Destacar só a vizinhança dos conflitos</Text>
          </Space>
          <Input
            allowClear
            size="small"
            placeholder="Filtrar lista"
            prefix={<Icon name="IconSearch" />}
            value={filter}
            onChange={event => setFilter(event.target.value)}
          />
        </SideHeader>
        <SideBody>
          {selectedEntity ? (
            <div style={{ padding: 12 }}>
              <Button
                type="link"
                size="small"
                style={{ paddingLeft: 0 }}
                icon={<Icon name="IconArrowLeft" />}
                onClick={() => setSelected(null)}>
                Voltar à lista
              </Button>
              <EntityDetails
                network={network}
                adjacency={adjacency}
                entity={selectedEntity}
                degree={columns.columnOf.get(selectedEntity.id) ?? 0}
                onNavigate={focusOn}
                onFocus={selectedEntity.kind === 'company' ? onCentralChange : undefined}
              />
            </div>
          ) : (
            <Collapse
              ghost
              size="small"
              defaultActiveKey={['1', '2']}
              items={columns.groups.map((group, index) => {
                const visibleRows = group.filter(id =>
                  (byId.get(id)?.name.toLowerCase() ?? '').includes(filterLower),
                )
                return {
                  key: String(index),
                  label: (
                    <Space>
                      <Text strong>{COLUMN_LABELS[index] ?? `${index}º grau`}</Text>
                      <Tag>{group.length}</Tag>
                      {group.some(id => network.conflictIds.has(id)) && (
                        <Tag color="warning">
                          {group.filter(id => network.conflictIds.has(id)).length} conflito(s)
                        </Tag>
                      )}
                    </Space>
                  ),
                  children: visibleRows.map(id => {
                    const entity = byId.get(id) as NetworkEntity
                    return (
                      <ListRow key={id} $active={id === selected} onClick={() => focusOn(id)}>
                        <span
                          style={{
                            color:
                              entity.kind === 'company' ? token.colorPrimary : token.colorSuccess,
                          }}>
                          <Icon name={entity.kind === 'company' ? 'IconBuilding' : 'IconUser'} />
                        </span>
                        <Text ellipsis style={{ flex: 1 }}>
                          {entity.name}
                        </Text>
                        {network.conflictIds.has(id) && (
                          <span style={{ color: token.colorWarning }}>
                            <Icon name="IconAlertTriangleFilled" />
                          </span>
                        )}
                      </ListRow>
                    )
                  }),
                }
              })}
            />
          )}
        </SideBody>
      </Side>
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
          minZoom={0.05}
          maxZoom={2}
          nodesConnectable={false}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelected(null)}>
          <Background gap={24} color="#e8e8e8" />
          <Panel position="top-left">
            <Space wrap>
              <ExportMenu
                title={`${byId.get(centralId)?.name ?? ''} · proposta C`}
                network={network}
                centralId={centralId}
              />
              {columns.groups.map((group, index) => (
                <Tag key={index} bordered={false}>
                  {COLUMN_LABELS[index] ?? `${index}º grau`}: {group.length}
                </Tag>
              ))}
            </Space>
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
      </div>
      <ColumnHeader style={{ display: 'none' }} />
    </Shell>
  )
}

export const VariantC: FC<VariantProps> = props => (
  <ReactFlowProvider>
    <Flow {...props} />
  </ReactFlowProvider>
)
