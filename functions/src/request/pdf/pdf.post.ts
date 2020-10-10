import * as functions from 'firebase-functions';

import * as cors from 'cors';

import * as PDFDocument from 'pdfkit';

// TODO JONATHAN

export function postGeneratePdf(request: functions.Request, response: functions.Response<any>) {
  const corsHandler = cors({origin: true});

  corsHandler(request, response, () => {
    const doc: PDFKit.PDFDocument = new PDFDocument();

    doc.text('Hello World! This is the first test for Owlly!', 100, 100);

    // https://stackoverflow.com/a/54355501/5404186

    response.setHeader('Content-disposition', 'attachment; filename="hello.pdf"');
    response.setHeader('Content-type', 'application/pdf');

    doc.pipe(response.status(200));

    doc.end();
  });
}
