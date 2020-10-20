import * as PDFDocument from 'pdfkit';

export async function generatePDFDoc(): Promise<PDFKit.PDFDocument> {
  const doc: PDFKit.PDFDocument = new PDFDocument();

  doc.image(process.cwd() + '/assets/images/owlly_top.png', (doc.page.width - 277 * 0.22) / 2, -15, {scale: 0.22});

  doc
    .fillColor('red')
    .font(process.cwd() + '/assets/fonts/JustAnotherHand-Regular.ttf')
    .fontSize(16)
    .text('KANTONALE VOLKSINITIATIVE', 0, 39.5, {align: 'center'});

  doc.text('Hello World 2! This is the first test for Owlly!', 100, 100);

  return doc;
}
