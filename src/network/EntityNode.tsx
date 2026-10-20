import type { Node, NodeHandle, NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { Badge, theme, Tooltip } from 'antd'
import type { FC } from 'react'
import { memo } from 'react'
import styled from 'styled-components'

import type { NetworkEntity } from './graph'
import { Icon } from './Icon'

export type HandleLayout = 'vertical' | 'horizontal' | 'center'

export interface EntityNodeData extends Record<string, unknown> {
  entity: NetworkEntity
  degree: number
  dimmed: boolean
  highlighted: boolean
  conflict: boolean
  handles: HandleLayout
  hiddenCount?: number | undefined
  expanded?: boolean | undefined
  caption?: string | undefined
}

export type EntityFlowNode = Node<EntityNodeData, 'entity'>

export const NODE_WIDTH = 236
export const NODE_HEIGHT = 64

// Static handle geometry. React Flow only keeps DOM-measured handle bounds while the node object
// carries `measured`; uncontrolled nodes rebuilt on every render lose them and edges vanish.
// Declaring the handles on the node sidesteps the measurement entirely.
export const handlesFor = (layout: HandleLayout): NodeHandle[] => {
  const point = (x: number, y: number) => ({ x, y, width: 1, height: 1 })
  if (layout === 'vertical') {
    return [
      { type: 'target', position: Position.Top, ...point(NODE_WIDTH / 2, 0) },
      { type: 'source', position: Position.Bottom, ...point(NODE_WIDTH / 2, NODE_HEIGHT) },
    ]
  }
  if (layout === 'horizontal') {
    return [
      { type: 'target', position: Position.Left, ...point(0, NODE_HEIGHT / 2) },
      { type: 'source', position: Position.Right, ...point(NODE_WIDTH, NODE_HEIGHT / 2) },
    ]
  }
  return [
    { type: 'target', position: Position.Top, ...point(NODE_WIDTH / 2, NODE_HEIGHT / 2) },
    { type: 'source', position: Position.Bottom, ...point(NODE_WIDTH / 2, NODE_HEIGHT / 2) },
  ]
}

const Card = styled.div<{
  $border: string
  $background: string
  $dimmed: boolean
  $emphasis: boolean
}>`
  width: ${NODE_WIDTH}px;
  height: ${NODE_HEIGHT}px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  border: ${p => (p.$emphasis ? 2 : 1)}px solid ${p => p.$border};
  background: ${p => p.$background};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  opacity: ${p => (p.$dimmed ? 0.2 : 1)};
  transition:
    opacity 0.15s ease,
    box-shadow 0.15s ease;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
`

const Avatar = styled.div<{ $color: string; $background: string }>`
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: ${p => p.$background};
  color: ${p => p.$color};
  font-size: 16px;
`

const Text = styled.div`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Name = styled.div<{ $muted: boolean }>`
  font-size: 13px;
  font-weight: 600;
  line-height: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${p => (p.$muted ? '#bfbfbf' : '#262626')};
`

const Caption = styled.div`
  font-size: 11px;
  line-height: 14px;
  color: #8c8c8c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Flags = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: none;
  font-size: 14px;
`

const CenterHandle = styled(Handle)`
  top: 50%;
  left: 50%;
  width: 1px;
  height: 1px;
  min-width: 0;
  min-height: 0;
  opacity: 0;
  pointer-events: none;
`

const HiddenHandle = styled(Handle)`
  opacity: 0;
  pointer-events: none;
`

const EntityNodeComponent: FC<NodeProps<EntityFlowNode>> = ({ data, selected }) => {
  const { token } = theme.useToken()
  const { entity, dimmed, highlighted, conflict, handles, hiddenCount, expanded, caption } = data
  const isCompany = entity.kind === 'company'
  const isInactive = isCompany && entity.registrationStatus !== 'Ativa'
  const isOwn = entity.role === 'own'
  const isCentral = data.degree === 0 && !isOwn

  const border = selected
    ? token.colorPrimary
    : isCentral
      ? token.colorPrimary
      : isOwn
        ? token.colorSuccess
        : conflict
          ? token.colorWarning
          : highlighted
            ? token.colorPrimaryBorderHover
            : token.colorBorder
  const background = isCentral
    ? token.colorPrimaryBg
    : isOwn
      ? token.colorSuccessBg
      : conflict && !dimmed
        ? token.colorWarningBg
        : token.colorBgContainer

  const subtitle =
    caption ??
    [entity.title, entity.document, isInactive ? entity.registrationStatus : undefined]
      .filter(Boolean)
      .join(' · ')

  return (
    <>
      {handles === 'vertical' && <HiddenHandle type="target" position={Position.Top} />}
      {handles === 'horizontal' && <HiddenHandle type="target" position={Position.Left} />}
      {handles === 'center' && <CenterHandle type="target" position={Position.Top} />}

      <Badge
        count={hiddenCount && !expanded ? `+${hiddenCount}` : 0}
        color={token.colorPrimary}
        offset={[-6, 6]}
        size="small">
        <Card
          $border={border}
          $background={background}
          $dimmed={dimmed}
          $emphasis={Boolean(selected) || isCentral || isOwn}>
          <Avatar
            $color={isCompany ? token.colorPrimary : token.colorSuccess}
            $background={isCompany ? token.colorPrimaryBg : token.colorSuccessBg}>
            <Icon name={isCompany ? 'IconBuilding' : 'IconUser'} />
          </Avatar>
          <Text>
            <Name $muted={isInactive}>{entity.name}</Name>
            <Caption>{subtitle}</Caption>
          </Text>
          <Flags>
            {conflict && (
              <Tooltip title="Conflito de interesse">
                <span style={{ color: token.colorWarning }}>
                  <Icon name="IconAlertTriangleFilled" />
                </span>
              </Tooltip>
            )}
            {entity.restrictedLists.length > 0 && (
              <Tooltip title={`Lista: ${entity.restrictedLists.join(', ')}`}>
                <span style={{ color: token.colorError }}>
                  <Icon name="IconBan" />
                </span>
              </Tooltip>
            )}
            {entity.pep && (
              <Tooltip title="Pessoa politicamente exposta">
                <span style={{ color: token.colorTextSecondary }}>
                  <Icon name="IconGavel" />
                </span>
              </Tooltip>
            )}
            {isOwn && (
              <Tooltip title="Sua casa">
                <span style={{ color: token.colorSuccess }}>
                  <Icon name="IconHome" />
                </span>
              </Tooltip>
            )}
          </Flags>
        </Card>
      </Badge>

      {handles === 'vertical' && <HiddenHandle type="source" position={Position.Bottom} />}
      {handles === 'horizontal' && <HiddenHandle type="source" position={Position.Right} />}
      {handles === 'center' && <CenterHandle type="source" position={Position.Bottom} />}
    </>
  )
}

export const EntityNode = memo(EntityNodeComponent)

export const nodeTypes = { entity: EntityNode }
