import * as functions from 'firebase-functions';

import * as PDFDocument from 'pdfkit';

// TODO JONATHAN

interface OwllyDocumentInfo extends PDFKit.DocumentInfo {
  OwllyId: string;
}

export function getGeneratePdf(request: functions.Request, response: functions.Response<any>) {
  const owllyId: string | undefined = request.params.owllyId;

  if (!owllyId) {
    response.status(500).json({
      error: 'OwllyId not provided',
    });

    return;
  }

  const doc: PDFKit.PDFDocument = new PDFDocument();

  (doc.info as OwllyDocumentInfo).OwllyId = owllyId;

  doc.text('Hello World! This is the first test for Owlly!', 100, 100);

  // https://stackoverflow.com/a/54355501/5404186

  response.setHeader('Content-disposition', 'attachment; filename="hello.pdf"');
  response.setHeader('Content-type', 'application/pdf');

  doc.pipe(response.status(200));

  doc.end();
}
