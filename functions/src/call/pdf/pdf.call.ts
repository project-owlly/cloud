import {CallableContext} from 'firebase-functions/lib/providers/https';
import * as admin from 'firebase-admin';

import {generatePDFDoc} from './utils/pdf.utils';

const db = admin.firestore();

interface OwllyDocumentInfo extends PDFKit.DocumentInfo {
  OwllyId: string;
  Eid: string;
}

export async function callGeneratePdfUrl(data: any, context: CallableContext): Promise<any | undefined> {
  //console.log("data " + JSON.stringify(data));
  //console.log("context " + JSON.stringify(context.rawRequest.body));

  const owllyId: string | undefined = data.owllyId;
  const eId: string = data.userData.sub;

  if (!owllyId) {
    return {
      error: 'OwllyId not provided',
    };
  }

  const formData: any = data;
  const owllyData = await db.collection('owlly').doc(owllyId).get();
  if (owllyData.exists) {
    //für testformular auf owllywebsite
    formData['owllyData'] = owllyData.data();
  }

  const owllyPDF = admin
    .storage()
    .bucket()
    .file('unsigned/' + data.owllyId + '/' + data.userData.sub + '/' + data.owllyData.filename + '.pdf', {});

  const doc: PDFKit.PDFDocument = await generatePDFDoc(formData);

  //doc.pipe(response.status(200));
  doc.pipe(
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

  doc.info.Producer = 'Owlly';
  doc.info.Creator = 'Owlly';

  doc.end();

  const signedURL = await owllyPDF.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 10, // always a valid date now
    //responseType: 'application/pdf',
    //contentType: 'application/pdf',
  });

  // Make entry in DB
  await db
    .collection('owlly-admin')
    .doc(owllyId)
    .collection('unsigned')
    .doc(eId)
    .set({
      generated: new Date(),
      ...data.userData,
    });

  return {
    url: signedURL[0],
  };
}
