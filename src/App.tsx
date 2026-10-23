// Standalone mock-up: three proposals for an ownership-network map, switchable from the header.
// All data is fictional (the houses of Westeros as companies); nothing here comes from a real system.
import {
  App as AntdApp,
  Button,
  ConfigProvider,
  Drawer,
  Segmented,
  Select,
  Space,
  Tag,
  theme,
  Typography,
} from 'antd'
import ptBR from 'antd/locale/pt_BR'
import { useEffect, useMemo, useState } from 'react'
import type { FC } from 'react'
import { BrowserRouter, useSearchParams } from 'react-router-dom'
import styled, { createGlobalStyle } from 'styled-components'
import '@xyflow/react/dist/style.css'

import type { NetworkSize } from './network/graph'
import { Icon } from './network/Icon'
import { buildNetwork } from './network/westeros'
import { VariantA } from './variants/VariantA'
import { VariantB } from './variants/VariantB'
import { VariantC } from './variants/VariantC'

const { Title, Text, Paragraph } = Typography

const VARIANTS = [
  {
    key: 'A',
    name: 'Mapa completo em faixas',
    summary:
      'Tudo visível o tempo todo. Faixas horizontais por grau, régua à esquerda com as contagens, busca, e um controle de grau que só esmaece o que está longe, nunca esconde. Clicar num nó abre os detalhes num painel lateral.',
    strengths: 'Visão de conjunto imediata; nada fica oculto; bom para exportar.',
    risks: 'Mapas com centenas de entidades ficam densos; depende do zoom.',
  },
  {
    key: 'B',
    name: 'Exploração progressiva radial',
    summary:
      'Começa só com a casa consultada e o 1º grau, em anéis. Cada nó mostra quantos vínculos ainda estão ocultos; clique abre, duplo clique recentraliza. Botões para abrir até o 2º, 3º grau ou tudo.',
    strengths: 'Sempre legível, mesmo em redes enormes; o usuário controla a profundidade.',
    risks: 'Exige interação para enxergar o todo; o caminho até um conflito distante pode levar cliques.',
  },
  {
    key: 'C',
    name: 'Colunas de conflito + caminho',
    summary:
      'Sua casa à esquerda, as casas analisadas no meio e o resto abrindo para a direita. Pessoas compartilhadas ficam entre as colunas, o que torna o conflito visível pela posição. Lista lateral navegável e "Buscar conexão" traça o caminho entre duas entidades.',
    strengths: 'Responde direto à pergunta "por que há conflito?"; caminho entre entidades.',
    risks: 'Colunas crescem em altura; relações fora do eixo conflito ficam menos evidentes.',
  },
] as const

type VariantKey = (typeof VARIANTS)[number]['key']

const GlobalStyle = createGlobalStyle`
  html, body, #root { margin: 0; height: 100%; background: #f5f5f5; }
  body { font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  *, *::before, *::after { box-sizing: border-box; }
`

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 12px 16px 16px;
  gap: 12px;
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`

// React Flow's edge <svg> has a parent without width; a global `svg { max-width: 100% }` reset would
// collapse it to zero and nothing would paint. Kept here as insurance against host resets.
const Canvas = styled.main`
  flex: 1;
  min-height: 0;

  .react-flow__edges svg {
    max-width: none;
  }
`

const Page: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [about, setAbout] = useState(false)

  const variant = (VARIANTS.some(v => v.key === searchParams.get('variant'))
    ? searchParams.get('variant')
    : 'A') as VariantKey
  const size: NetworkSize = searchParams.get('size') === 'medium' ? 'medium' : 'small'
  const network = useMemo(() => buildNetwork(size), [size])

  const houses = network.entities.filter(e => e.kind === 'company' && e.role !== 'own')
  const centralParam = searchParams.get('central')
  const centralId =
    centralParam && network.entities.some(e => e.id === centralParam)
      ? centralParam
      : network.centralId
  const central = network.entities.find(e => e.id === centralId)

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set(key, value)
    setSearchParams(params, { replace: true })
  }

  useEffect(() => {
    document.title = `Rede societária · ${central?.name ?? ''}`
  }, [central])

  const current = VARIANTS.find(v => v.key === variant) ?? VARIANTS[0]
  const variantProps = { network, centralId, onCentralChange: (id: string) => setParam('central', id) }

  return (
    <Shell>
      <Header>
        <Space size="middle" wrap>
          <Title level={4} style={{ margin: 0 }}>
            <Icon name="IconAffiliate" /> Rede societária
          </Title>
          <Segmented
            value={variant}
            onChange={value => setParam('variant', String(value))}
            options={VARIANTS.map(v => ({ label: `${v.key} · ${v.name}`, value: v.key }))}
          />
        </Space>
        <Space wrap>
          <Text type="secondary">Casa consultada</Text>
          <Select
            showSearch
            optionFilterProp="label"
            value={centralId}
            onChange={value => setParam('central', value)}
            style={{ width: 320 }}
            options={houses.map(h => ({ value: h.id, label: h.name }))}
          />
          <Segmented
            value={size}
            onChange={value => setParam('size', String(value))}
            options={[
              { label: 'Casa Stark', value: 'small' },
              { label: 'Grandes casas', value: 'medium' },
            ]}
          />
          <Button icon={<Icon name="IconInfoCircle" />} onClick={() => setAbout(true)}>
            Sobre as propostas
          </Button>
          <Tag color="magenta">Dados fictícios</Tag>
        </Space>
      </Header>

      <Canvas>
        {variant === 'A' && <VariantA {...variantProps} />}
        {variant === 'B' && <VariantB {...variantProps} />}
        {variant === 'C' && <VariantC {...variantProps} />}
      </Canvas>

      <Drawer open={about} onClose={() => setAbout(false)} size={520} title="Sobre as propostas">
        <Paragraph>
          Três formas de visualizar a mesma rede de vínculos entre a sua empresa, as empresas
          analisadas e os sócios de cada uma. Os dados são inteiramente fictícios: as grandes casas de
          Westeros fazem o papel das empresas, e seus membros, o dos sócios e administradores.
        </Paragraph>
        <Paragraph>
          Setas vão da empresa para quem participa dela. Linhas tracejadas são vínculos encerrados.
          Amarelo marca conflito (pessoa ligada à sua casa e a uma casa analisada), vermelho marca
          lista restritiva.
        </Paragraph>
        {VARIANTS.map(v => (
          <div key={v.key} style={{ marginBottom: 20 }}>
            <Title level={5} style={{ marginBottom: 4 }}>
              <Tag color={v.key === current.key ? 'blue' : 'default'}>{v.key}</Tag>
              {v.name}
            </Title>
            <Paragraph style={{ marginBottom: 4 }}>{v.summary}</Paragraph>
            <Text type="success">Forças: </Text>
            <Text>{v.strengths}</Text>
            <br />
            <Text type="warning">Riscos: </Text>
            <Text>{v.risks}</Text>
          </div>
        ))}
        <Paragraph type="secondary">
          O botão "Exportar" de cada proposta gera o mapa inteiro em PNG, JPG ou PDF, no estado em que
          está na tela. Use ← e → no teclado para alternar entre as propostas. A URL carrega a proposta, a casa
          consultada e o tamanho da rede, então o link pode ser compartilhado.
        </Paragraph>
      </Drawer>
      <KeyboardSwitcher current={variant} onChange={key => setParam('variant', key)} />
    </Shell>
  )
}

const KeyboardSwitcher: FC<{ current: VariantKey; onChange: (key: VariantKey) => void }> = ({
  current,
  onChange,
}) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.isContentEditable))
        return
      const index = VARIANTS.findIndex(v => v.key === current)
      if (event.key === 'ArrowRight') onChange(VARIANTS[(index + 1) % VARIANTS.length]!.key)
      if (event.key === 'ArrowLeft')
        onChange(VARIANTS[(index - 1 + VARIANTS.length) % VARIANTS.length]!.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, onChange])
  return null
}

export const App: FC = () => (
  <ConfigProvider
    locale={ptBR}
    theme={{
      algorithm: theme.defaultAlgorithm,
      token: {
        colorPrimary: '#1677ff',
        fontFamily:
          "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      },
    }}>
    <GlobalStyle />
    <AntdApp>
      <BrowserRouter>
        <Page />
      </BrowserRouter>
    </AntdApp>
  </ConfigProvider>
)

export default App
