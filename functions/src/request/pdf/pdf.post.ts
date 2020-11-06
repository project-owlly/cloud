import * as functions from 'firebase-functions';
import * as cors from 'cors';

import * as admin from 'firebase-admin';

import {generatePDFDoc} from './utils/pdf.utils';

const db = admin.firestore();

interface OwllyDocumentInfo extends PDFKit.DocumentInfo {
  OwllyId: string;
  Eid: string;
}

export function postGeneratePdf(request: functions.Request, response: functions.Response<any>) {
  const corsHandler = cors({
    origin: true,
    methods: 'POST',
  });

  corsHandler(request, response, async () => {
    try {
      const owllyId: string | undefined = request.body.data.owllyId;
      const eId: string = request.body.data.userData.sub;

      if (!owllyId) {
        response.status(500).json({
          error: 'OwllyId not provided',
        });

        return;
      }

      let formData: any = request.body.data;
      const owllyData = await db.collection('owlly').doc(owllyId).get();
      if (owllyData.exists) {
        //für testformular auf owllywebsite
        formData.owllyData = owllyData.data();
      }

      const owllyPDF = admin
        .storage()
        .bucket()
        .file(formData.userData.sub + '/' + formData.owllyData + '.pdf', {});

      const doc: PDFKit.PDFDocument = await generatePDFDoc(formData);

      // Metadata
      (doc.info as OwllyDocumentInfo).OwllyId = owllyId;
      (doc.info as OwllyDocumentInfo).Eid = eId;

      // https://stackoverflow.com/a/54355501/5404186

      response.setHeader('Content-disposition', `attachment; filename="${owllyId + '-' + eId}.pdf"`);
      response.setHeader('Content-type', 'application/pdf');

      //doc.pipe(response.status(200));
      const stream = doc.pipe(
        owllyPDF.createWriteStream({
          contentType: 'application/pdf',
          metadata: {
            customMetadata: {
              //"titel": initiative.titel,
              //"subtitel": initiative.subtitel,
              //"text": initiative.text,
              //"eid": user.sub
            },
          },
        })
      ); //save to firebase bucket

      doc.end();
      owllyPDF
        .getSignedUrl({
          action: 'read',
          expires: new Date().toISOString().substr(0, 10),
        })
        .then((signedUrl) => {
          response.status(200);
          return response.json({
            url: signedUrl[0],
          });
        });
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}
