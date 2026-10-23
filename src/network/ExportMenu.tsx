import { useReactFlow } from '@xyflow/react'
import { App as AntdApp, Button, Dropdown } from 'antd'
import type { FC } from 'react'
import { useState } from 'react'

import type { ExportFormat } from './exportMap'
import { exportGraph } from './exportMap'
import { Icon } from './Icon'

const FORMATS: Array<{ key: ExportFormat; label: string }> = [
  { key: 'png', label: 'Imagem PNG' },
  { key: 'jpg', label: 'Imagem JPG' },
  { key: 'pdf', label: 'Documento PDF' },
]

export const ExportMenu: FC<{ title: string }> = ({ title }) => {
  const { getNodes } = useReactFlow()
  const { message } = AntdApp.useApp()
  const [busy, setBusy] = useState(false)

  const run = async (format: ExportFormat) => {
    setBusy(true)
    try {
      await exportGraph(getNodes(), format, title)
      message.success(`Exportado em ${format.toUpperCase()}`)
    } catch (error) {
      console.error(error)
      message.error('Não foi possível exportar o mapa')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dropdown
      menu={{
        items: FORMATS.map(f => ({ key: f.key, label: f.label })),
        onClick: ({ key }) => void run(key as ExportFormat),
      }}
      trigger={['click']}>
      <Button icon={<Icon name="IconDownload" />} loading={busy}>
        Exportar
      </Button>
    </Dropdown>
  )
}
