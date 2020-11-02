import * as functions from 'firebase-functions';
import * as cors from 'cors';

import {generatePDFDoc} from './utils/pdf.utils';

interface OwllyDocumentInfo extends PDFKit.DocumentInfo {
  OwllyId: string;
  Eid: string;
}

export function postGeneratePdf(request: functions.Request, response: functions.Response<any>) {
  const owllyId: string | undefined = request.body.data.owllyId;
  const eId: string = request.body.data.userData.sub;

  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      if (!owllyId) {
        response.status(500).json({
          error: 'OwllyId not provided',
        });

        return;
      }

      const doc: PDFKit.PDFDocument = await generatePDFDoc(request.body.data);

      // Metadata

      (doc.info as OwllyDocumentInfo).OwllyId = owllyId;
      (doc.info as OwllyDocumentInfo).Eid = eId;

      // https://stackoverflow.com/a/54355501/5404186

      response.setHeader('Content-disposition', `attachment; filename="${owllyId + '-' + eId}.pdf"`);
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
