import { Button, Divider, Space, Tag, theme, Typography } from 'antd'
import type { FC } from 'react'
import styled from 'styled-components'

import type { Adjacency, Network, NetworkEntity } from './graph'
import { entityById, RELATION_LABEL } from './graph'
import { Icon } from './Icon'

const { Text, Title } = Typography

const Header = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Row = styled.button<{ $ended: boolean }>`
  all: unset;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  opacity: ${p => (p.$ended ? 0.45 : 1)};

  &:hover {
    background: #f5f5f5;
  }
`

const RowText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`

interface EntityDetailsProps {
  network: Network
  adjacency: Adjacency
  entity: NetworkEntity
  degree?: number
  onNavigate: (id: string) => void
  onFocus?: ((id: string) => void) | undefined
}

export const EntityDetails: FC<EntityDetailsProps> = ({
  network,
  adjacency,
  entity,
  degree,
  onNavigate,
  onFocus,
}) => {
  const { token } = theme.useToken()
  const byId = entityById(network)
  const entries = adjacency.get(entity.id) ?? []
  const ownedBy = entries.filter(e => e.link.from === entity.id)
  const participatesIn = entries.filter(e => e.link.to === entity.id)
  const isCompany = entity.kind === 'company'
  const inConflict = network.conflictIds.has(entity.id)

  const renderRow = (
    otherId: string,
    relation: string,
    share: number | undefined,
    ended: boolean,
  ) => {
    const other = byId.get(otherId)
    if (!other) return null
    return (
      <Row
        key={`${entity.id}-${otherId}-${relation}`}
        $ended={ended}
        onClick={() => onNavigate(otherId)}>
        <span style={{ color: other.kind === 'company' ? token.colorPrimary : token.colorSuccess }}>
          <Icon name={other.kind === 'company' ? 'IconBuilding' : 'IconUser'} />
        </span>
        <RowText>
          <Text ellipsis strong={network.conflictIds.has(otherId)}>
            {other.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {relation}
            {ended ? ' · vínculo encerrado' : ''}
          </Text>
        </RowText>
        {share !== undefined && <Text strong>{share}%</Text>}
        {network.conflictIds.has(otherId) && (
          <span style={{ color: token.colorWarning }}>
            <Icon name="IconAlertTriangleFilled" />
          </span>
        )}
      </Row>
    )
  }

  return (
    <div>
      <Header>
        <span style={{ fontSize: 28, color: isCompany ? token.colorPrimary : token.colorSuccess }}>
          <Icon name={isCompany ? 'IconBuilding' : 'IconUser'} />
        </span>
        <div style={{ minWidth: 0 }}>
          <Title level={5} style={{ margin: 0 }}>
            {entity.name}
          </Title>
          <Text type="secondary">
            {isCompany ? 'CNPJ' : 'CPF'} {entity.document}
          </Text>
          <div style={{ marginTop: 8 }}>
            <Space size={[4, 4]} wrap>
              {entity.title && <Tag color="geekblue">{entity.title}</Tag>}
              {entity.role === 'own' && <Tag color="success">Sua casa</Tag>}
              {entity.role === 'analyzed' && <Tag color="processing">Analisada</Tag>}
              {degree !== undefined && degree > 0 && <Tag>{degree}º grau</Tag>}
              {isCompany && entity.registrationStatus !== 'Ativa' && (
                <Tag>{entity.registrationStatus}</Tag>
              )}
              {inConflict && <Tag color="warning">Conflito</Tag>}
              {entity.restrictedLists.map(list => (
                <Tag key={list} color="error">
                  {list}
                </Tag>
              ))}
              {entity.pep && <Tag color="purple">PEP</Tag>}
            </Space>
          </div>
        </div>
      </Header>

      {onFocus && (
        <Button
          block
          style={{ marginTop: 16 }}
          icon={<Icon name="IconFocusCentered" />}
          onClick={() => onFocus(entity.id)}>
          Centralizar neste nó
        </Button>
      )}

      {isCompany && (
        <>
          <Divider titlePlacement="start" plain>
            Quadro societário ({ownedBy.length})
          </Divider>
          <Rows>
            {ownedBy.map(({ link, otherId }) =>
              renderRow(otherId, RELATION_LABEL[link.relation], link.share, !link.active),
            )}
            {ownedBy.length === 0 && <Text type="secondary">Nenhum membro conhecido</Text>}
          </Rows>
        </>
      )}

      <Divider titlePlacement="start" plain>
        {isCompany
          ? `Controlada por (${participatesIn.length})`
          : `Participa em (${participatesIn.length})`}
      </Divider>
      <Rows>
        {participatesIn.map(({ link, otherId }) =>
          renderRow(otherId, RELATION_LABEL[link.relation], link.share, !link.active),
        )}
        {participatesIn.length === 0 && <Text type="secondary">Nenhuma participação</Text>}
      </Rows>
    </div>
  )
}
