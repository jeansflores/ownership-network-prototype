// Exports the whole graph (not just what is on screen) as PNG, JPG or PDF.
// Follows the React Flow recipe: compute the bounds of every node, then rasterise the viewport
// element with a transform that frames those bounds, at a pixel ratio the browser can handle.
import type { Node } from '@xyflow/react'
import { getNodesBounds } from '@xyflow/react'
import { toJpeg, toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

export type ExportFormat = 'png' | 'jpg' | 'pdf'

const PADDING = 80
const MAX_CANVAS_SIDE = 12000
const BACKGROUND = '#ffffff'

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const download = (href: string, fileName: string) => {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = fileName
  anchor.click()
}

async function renderGraph(nodes: Node[], format: 'png' | 'jpg') {
  const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
  if (!viewport) throw new Error('viewport not mounted')

  const bounds = getNodesBounds(nodes)
  const width = Math.ceil(bounds.width + PADDING * 2)
  const height = Math.ceil(bounds.height + PADDING * 2)
  const pixelRatio = Math.max(0.5, Math.min(2, MAX_CANVAS_SIDE / Math.max(width, height)))
  const options = {
    backgroundColor: BACKGROUND,
    width,
    height,
    pixelRatio,
    cacheBust: true,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${-bounds.x + PADDING}px, ${-bounds.y + PADDING}px) scale(1)`,
    },
  }
  const dataUrl =
    format === 'jpg'
      ? await toJpeg(viewport, { ...options, quality: 0.92 })
      : await toPng(viewport, options)
  return { dataUrl, width, height }
}

export async function exportGraph(nodes: Node[], format: ExportFormat, title: string) {
  const fileName = `rede-societaria-${slug(title)}`

  if (format !== 'pdf') {
    const { dataUrl } = await renderGraph(nodes, format)
    download(dataUrl, `${fileName}.${format}`)
    return
  }

  const { dataUrl, width, height } = await renderGraph(nodes, 'png')
  const landscape = width >= height
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 12
  const headerHeight = 14

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(`Rede societária · ${title}`, margin, margin + 5)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(120)
  pdf.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} · dados fictícios`,
    margin,
    margin + 10.5,
  )

  const availableWidth = pageWidth - margin * 2
  const availableHeight = pageHeight - margin * 2 - headerHeight
  const scale = Math.min(availableWidth / width, availableHeight / height)
  const drawWidth = width * scale
  const drawHeight = height * scale
  const x = margin + (availableWidth - drawWidth) / 2
  const y = margin + headerHeight + (availableHeight - drawHeight) / 2
  pdf.addImage(dataUrl, 'PNG', x, y, drawWidth, drawHeight, undefined, 'FAST')
  pdf.save(`${fileName}.pdf`)
}
