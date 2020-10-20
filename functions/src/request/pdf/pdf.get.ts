import * as functions from 'firebase-functions';
import * as cors from 'cors';

import {generatePDFDoc} from './utils/pdf.utils';

interface OwllyDocumentInfo extends PDFKit.DocumentInfo {
  OwllyId: string;
}

export function getGeneratePdf(request: functions.Request, response: functions.Response<any>) {
  const owllyId: string | undefined = request.params.owllyId;

  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      // const owllyId: string | undefined = request.body.data.owllyId;

      if (!owllyId) {
        response.status(500).json({
          error: 'OwllyId not provided',
        });

        return;
      }

      const doc: PDFKit.PDFDocument = await generatePDFDoc();

      // Metadata

      (doc.info as OwllyDocumentInfo).OwllyId = owllyId;

      // https://stackoverflow.com/a/54355501/5404186

      response.setHeader('Content-disposition', `attachment; filename="${owllyId}.pdf"`);
      response.setHeader('Content-type', 'application/pdf');

      doc.pipe(response.status(200));

      doc.end();
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}
