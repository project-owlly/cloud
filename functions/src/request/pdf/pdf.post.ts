import {CallableContext} from 'firebase-functions/lib/providers/https';
import * as admin from 'firebase-admin';

import {generatePDFDoc} from './utils/pdf.utils';

const db = admin.firestore();

interface OwllyDocumentInfo extends PDFKit.DocumentInfo {
  OwllyId: string;
  Eid: string;
}
interface PDFDataRequest {
  url: string; // currently owllyId
}

export async function postGeneratePdf(data: any, context: CallableContext): Promise<any | undefined> {
  const owllyId: string | undefined = data.owllyId;
  const eId: string = data.userData.sub;

  if (!owllyId) {
    return {
      error: 'OwllyId not provided',
    };
  }

  let formData: any = data;
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

  //doc.pipe(response.status(200));
  const stream = doc.pipe(
    owllyPDF.createWriteStream({
      contentType: 'application/pdf',
      metadata: {
        customMetadata: {
          owllyId: owllyId,
          eId: eId,
        },
      },
    })
  ); //save to firebase bucket

  // Metadata
  (doc.info as OwllyDocumentInfo).OwllyId = owllyId;
  (doc.info as OwllyDocumentInfo).Eid = eId;

  doc.end();

  owllyPDF
    .getSignedUrl({
      action: 'read',
      expires: new Date().toISOString().substr(0, 10),
    })
    .then((signedUrl) => {
      return {
        url: signedUrl[0],
      };
    });
}
