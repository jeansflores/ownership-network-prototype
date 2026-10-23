# Rede societária · protótipo

Mock-up descartável de um **mapa de rede societária**: como mostrar os vínculos entre a sua empresa,
as empresas analisadas e os sócios de cada uma, de forma direta mas expansível. Existe para validar
três propostas de visualização com produto e design antes de qualquer implementação real.

**Todos os dados são fictícios.** As grandes casas de Westeros fazem o papel das empresas e seus
membros, o dos sócios e administradores, seguindo a hierarquia das famílias. CNPJs e CPFs são
gerados aleatoriamente e mascarados. Nenhuma informação aqui vem de um sistema real.

## As três propostas

| Proposta | Ideia | Quando brilha |
| --- | --- | --- |
| **A · Mapa completo em faixas** | Tudo visível, faixas por grau, controle de grau que só esmaece | Visão de conjunto, exportação |
| **B · Exploração progressiva radial** | Começa pela casa consultada e abre grau a grau; duplo clique recentraliza | Redes enormes |
| **C · Colunas de conflito + caminho** | Sua casa → casas analisadas → demais vínculos; traça o caminho entre duas entidades | Explicar *por que* há conflito |

Dois tamanhos de rede: **Casa Stark** (a casa, seus vassalos e as casas ligadas a ela por
uma pessoa) e **Grandes casas** (todas as grandes casas). Troque de proposta no cabeçalho ou com ← e →. A URL carrega a proposta (`variant`), a casa
consultada (`central`) e o tamanho da rede (`size=small|medium`), então um link pode ser enviado
apontando exatamente para o que se quer discutir.

Cada proposta tem um botão **Exportar**: a imagem do mapa inteiro, não só o que está na tela, em
PNG, JPG ou PDF (A4, com título e data); e os dados do grafo em CSV (entidades ou vínculos, separador
`;`) ou Excel com as duas abas.

Legenda: setas vão da empresa para quem participa dela; linha tracejada é vínculo encerrado;
amarelo é conflito (pessoa ligada à sua casa e a uma casa analisada); vermelho é lista restritiva.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
```

Stack: Vite, React, TypeScript, antd 6, React Flow (`@xyflow/react`), styled-components, Tabler Icons.

## Deploy no Netlify

Conecte o repositório; `netlify.toml` já define `npm run build`, pasta `dist` e o redirect de SPA.
Nada de variáveis de ambiente ou backend: a rede é montada no navegador.

## Estrutura

```
src/
├── App.tsx               cabeçalho, seletor de proposta, painel "Sobre as propostas"
├── network/
│   ├── westeros.ts       o dataset fictício (casas, membros, vínculos, listas restritivas)
│   ├── graph.ts          modelo e travessias (BFS, caminho mais curto, conflitos)
│   ├── layouts.ts        camadas, anéis radiais e colunas
│   ├── EntityNode.tsx    o cartão de nó compartilhado
│   └── EntityDetails.tsx o painel de detalhes compartilhado
└── variants/
    ├── VariantA.tsx
    ├── VariantB.tsx
    └── VariantC.tsx
```
