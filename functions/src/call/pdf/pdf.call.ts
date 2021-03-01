import {CallableContext} from 'firebase-functions/lib/providers/https';
import * as admin from 'firebase-admin';

import {generatePDFDoc} from './utils/pdf.utils';

const crypto = require('crypto');

const db = admin.firestore();

interface OwllyDocumentInfo extends PDFKit.DocumentInfo {
  OwllyId: string;
  Eid: string;
  FileId: string;
}

export async function callGeneratePdfUrl(data: any, context: CallableContext): Promise<any | undefined> {
  const owllyId: string | undefined = data.owllyId;
  const hash = crypto.createHash('sha256');
  const eId: string = hash.update(data.userData.sub).digest('hex'); // data.userData.sub;

  if (!owllyId) {
    return {
      error: 'OwllyId not provided',
    };
  }

  const formData: any = data;
  const owllyData = await db.collection('owlly').doc(owllyId).get();
  //für testformular auf owllywebsite
  if (owllyData.exists) {
    formData['owllyData'] = owllyData.data();
  }

  //SAVE FILE to Download later

  //clean up userData
  delete data.userData['picture'];
  delete data.userData['sub'];
  delete data.userData['verified_simple'];

  // Make entry in DB
  const tempOwllyDoc = await db.collection('tempfiles').add({
    generated: new Date(),
    postalcode: data.userData.postal_code,
    statusSigned: false,
    statusReminder: false,
    owllyId: owllyId,
    eId: eId,
    filename: data.owllyData.filename,
    data: data.userData, //TOOD: Hash IT?
    email: data.userData['email'] || '',
  });
  const increment = admin.firestore.FieldValue.increment(1);
  await db.collection('owlly').doc(owllyId).set(
    {
      owllyCreated: increment,
    },
    {
      merge: true,
    }
  );
  await db.collection('owlly').doc(owllyId).collection('postalcode').doc(String(data.userData.postal_code)).set(
    {
      owllyCreated: increment,
    },
    {
      merge: true,
    }
  );

  // Create a temp id..
  // File only valid some hours..
  const owllyPDF = admin
    .storage()
    .bucket()
    .file('tempfiles/' + tempOwllyDoc.id + '/' + data.owllyData.filename + '.pdf', {});

  const doc: PDFKit.PDFDocument = await generatePDFDoc(formData);

  //doc.pipe(response.status(200));
  doc.pipe(
    owllyPDF.createWriteStream({
      contentType: 'application/pdf',
      metadata: {
        customMetadata: {
          owllyId: owllyId,
          eId: eId,
          fileId: tempOwllyDoc.id,
        },
      },
    })
  ); //save to firebase bucket

  // Metadata
  (doc.info as OwllyDocumentInfo).OwllyId = owllyId;
  (doc.info as OwllyDocumentInfo).Eid = eId;
  (doc.info as OwllyDocumentInfo).FileId = tempOwllyDoc.id;

  //Producer MetaData
  doc.info.Producer = 'Owlly';
  doc.info.Creator = 'Owlly';

  doc.end();

  const signedURL = await owllyPDF.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 10, // always a valid date now
    //responseType: 'application/pdf',
    //contentType: 'application/pdf',
  });

  return {
    url: signedURL[0],
  };
}
