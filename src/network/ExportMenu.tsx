import { useReactFlow } from '@xyflow/react'
import { App as AntdApp, Button, Dropdown } from 'antd'
import type { FC } from 'react'
import { useState } from 'react'

import { buildEntityRows, buildLinkRows, downloadCsv, downloadXlsx } from './exportData'
import type { ExportFormat } from './exportMap'
import { exportGraph } from './exportMap'
import type { Network } from './graph'
import { Icon } from './Icon'

type DataFormat = 'csv-entities' | 'csv-links' | 'xlsx'
type MenuKey = ExportFormat | DataFormat

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

interface ExportMenuProps {
  title: string
  network: Network
  centralId: string
}

export const ExportMenu: FC<ExportMenuProps> = ({ title, network, centralId }) => {
  const { getNodes } = useReactFlow()
  const { message } = AntdApp.useApp()
  const [busy, setBusy] = useState(false)

  const run = async (key: MenuKey) => {
    setBusy(true)
    const fileName = `rede-societaria-${slug(title)}`
    try {
      if (key === 'csv-entities') downloadCsv(buildEntityRows(network, centralId), `${fileName}-entidades`)
      else if (key === 'csv-links') downloadCsv(buildLinkRows(network), `${fileName}-vinculos`)
      else if (key === 'xlsx') downloadXlsx(buildEntityRows(network, centralId), buildLinkRows(network), fileName)
      else await exportGraph(getNodes(), key, title)
      message.success('Exportação gerada')
    } catch (error) {
      console.error(error)
      message.error('Não foi possível exportar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dropdown
      menu={{
        items: [
          {
            type: 'group',
            label: 'Imagem do mapa',
            children: [
              { key: 'png', label: 'PNG' },
              { key: 'jpg', label: 'JPG' },
              { key: 'pdf', label: 'PDF (A4)' },
            ],
          },
          {
            type: 'group',
            label: 'Dados do grafo',
            children: [
              { key: 'csv-entities', label: 'Entidades (CSV)' },
              { key: 'csv-links', label: 'Vínculos (CSV)' },
              { key: 'xlsx', label: 'Excel com as duas abas' },
            ],
          },
        ],
        onClick: ({ key }) => void run(key as MenuKey),
      }}
      trigger={['click']}>
      <Button icon={<Icon name="IconDownload" />} loading={busy}>
        Exportar
      </Button>
    </Dropdown>
  )
}
