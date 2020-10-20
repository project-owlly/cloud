// import * as PDFDocument from 'pdfkit';
// import * as fs from 'fs';

import {owllyTop} from './images/owlly_top';

const SVGtoPDF = require('svg-to-pdfkit');

export async function generatePdfContent(doc: PDFKit.PDFDocument) {
  SVGtoPDF(doc, owllyTop, (doc.page.width - 277 * 0.22) / 2, -15, {scale: 0.22});

  // doc.fillColor('red').font('./fonts/Lato-Thin.ttf').fontSize(16).text('KANTONALE VOLKSINITIATIVE', 0, 39.5, {align: 'center'});
}

// (async () => {
//   try {
//     const doc: PDFKit.PDFDocument = new PDFDocument();
//
//     await generatePdfContent(doc);
//
//     doc.pipe(fs.createWriteStream('/tmp/file.pdf'));
//
//     doc.end();
//   } catch (e) {
//     console.error(e);
//   }
// })();