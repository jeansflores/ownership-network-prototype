// Tabular export of the graph: one table of entities, one of links. CSV uses ";" and a UTF-8 BOM so
// Excel in pt-BR opens it without an import wizard; XLSX carries both tables as sheets.
import { utils, writeFile } from 'xlsx'

import type { Network, NetworkEntity } from './graph'
import { bfsDepths, buildAdjacency, entityById, RELATION_LABEL } from './graph'

export type Row = Record<string, string | number>

const ROLE_LABEL: Record<NetworkEntity['role'], string> = {
  own: 'Sua casa',
  analyzed: 'Analisada',
  other: 'Outra',
}

const yesNo = (value: boolean) => (value ? 'Sim' : 'Não')

export function buildEntityRows(network: Network, centralId: string): Row[] {
  const depths = bfsDepths(buildAdjacency(network), [centralId])
  return network.entities.map(entity => ({
    Tipo: entity.kind === 'company' ? 'Empresa' : 'Pessoa',
    Nome: entity.name,
    Documento: entity.document,
    Papel: ROLE_LABEL[entity.role],
    Grau: depths.get(entity.id) ?? '',
    Título: entity.title ?? '',
    'Status cadastral': entity.kind === 'company' ? (entity.registrationStatus ?? '') : '',
    Conflito: yesNo(network.conflictIds.has(entity.id)),
    'Listas restritivas': entity.restrictedLists.join(', '),
    PEP: yesNo(entity.pep),
  }))
}

export function buildLinkRows(network: Network): Row[] {
  const byId = entityById(network)
  return network.links.flatMap(link => {
    const company = byId.get(link.from)
    const holder = byId.get(link.to)
    if (!company || !holder) return []
    return [
      {
        Empresa: company.name,
        'Documento da empresa': company.document,
        Participante: holder.name,
        'Documento do participante': holder.document,
        'Tipo do participante': holder.kind === 'company' ? 'Empresa' : 'Pessoa',
        Relação: RELATION_LABEL[link.relation],
        'Participação (%)': link.share ?? '',
        Situação: link.active ? 'Ativo' : 'Encerrado',
        Conflito: yesNo(network.conflictIds.has(link.from) || network.conflictIds.has(link.to)),
      },
    ]
  })
}

const csvCell = (value: string | number) => {
  const text = String(value)
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: Row[]): string {
  const first = rows[0]
  if (!first) return ''
  const headers = Object.keys(first)
  const lines = [headers.join(';'), ...rows.map(row => headers.map(h => csvCell(row[h] ?? '')).join(';'))]
  return `﻿${lines.join('\r\n')}`
}

export function downloadCsv(rows: Row[], fileName: string) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = `${fileName}.csv`
  anchor.click()
  URL.revokeObjectURL(href)
}

export function downloadXlsx(entities: Row[], links: Row[], fileName: string) {
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, utils.json_to_sheet(entities), 'Entidades')
  utils.book_append_sheet(workbook, utils.json_to_sheet(links), 'Vínculos')
  writeFile(workbook, `${fileName}.xlsx`)
}
