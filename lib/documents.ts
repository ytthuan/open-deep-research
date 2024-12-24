import { type Report } from '@/types'
import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
  Header,
  Footer,
  PageNumber,
} from 'docx'
import jsPDF from 'jspdf'

export async function generateDocx(report: Report): Promise<Buffer> {
  try {
    console.log(
      'Starting DOCX generation with report:',
      JSON.stringify(report, null, 2)
    )

    const doc = new Document({
      sections: [
        {
          properties: {},
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: report.title || 'Untitled Report',
                      size: 48,
                      bold: true,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 800 },
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun('Page '),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                    }),
                    new TextRun(' of '),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children: [
            // Summary with increased spacing
            new Paragraph({
              children: [
                new TextRun({
                  text: report.summary || '',
                  size: 24,
                }),
              ],
              spacing: { before: 800, after: 800 },
              alignment: AlignmentType.JUSTIFIED,
            }),
            // Sections with increased spacing
            ...report.sections.flatMap((section) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: section.title || '',
                    size: 32,
                    bold: true,
                  }),
                ],
                spacing: { before: 800, after: 400 },
                alignment: AlignmentType.LEFT,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: section.content || '',
                    size: 24,
                  }),
                ],
                spacing: { before: 400, after: 800 },
                alignment: AlignmentType.JUSTIFIED,
              }),
            ]),
          ],
        },
      ],
    })

    console.log('Document instance created')

    try {
      console.log('Starting document packing')
      const buffer = await Packer.toBuffer(doc)
      console.log('Document packed successfully, buffer size:', buffer.length)
      return buffer
    } catch (packError) {
      console.error('Error packing document:', packError)
      throw packError
    }
  } catch (error) {
    console.error('Error in generateDocx:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
    }
    throw new Error(
      `Failed to generate DOCX: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

export function generatePdf(report: Report): Buffer {
  try {
    // Create new PDF document (A4 format)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.width
    const margin = 20
    const contentWidth = pageWidth - 2 * margin

    // Helper function to add text with proper line breaks and page management
    const addText = (
      text: string,
      y: number,
      fontSize: number,
      isBold: boolean = false,
      isJustified: boolean = false
    ): number => {
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', isBold ? 'bold' : 'normal')

      const lines = doc.splitTextToSize(text, contentWidth)
      const lineHeight = fontSize * 0.3527 // Convert pt to mm

      lines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage()
          y = margin
        }

        doc.text(line, margin, y, {
          align: isJustified ? 'justify' : 'left',
          maxWidth: contentWidth,
        })
        y += lineHeight + 1 // 1mm extra spacing between lines
      })

      return y + lineHeight // Return new Y position
    }

    // Start position
    let currentY = margin

    // Title
    currentY = addText(report.title, currentY, 24, true)
    currentY += 10 // Extra spacing after title

    // Summary
    currentY = addText(report.summary, currentY, 12, false, true)
    currentY += 10 // Extra spacing after summary

    // Sections
    report.sections.forEach((section) => {
      // Add some spacing before section
      currentY += 5

      // Section title
      currentY = addText(section.title, currentY, 16, true)
      currentY += 5

      // Section content
      currentY = addText(section.content, currentY, 12, false, true)
      currentY += 5
    })

    // Add page numbers
    const pageCount = doc.internal.pages.length - 1 // -1 because pages array is 1-based
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 285, {
        align: 'center',
      })
    }

    // Convert the PDF to a Buffer
    return Buffer.from(doc.output('arraybuffer'))
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}
