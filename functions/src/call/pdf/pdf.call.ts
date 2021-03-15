import {CallableContext} from 'firebase-functions/lib/providers/https';
import * as admin from 'firebase-admin';

import {generatePDFDoc} from './utils/pdf.utils';
import {createSignatureRequest, downloadSignedPdf, loginSkribble} from './utils/skribble.utils';

const crypto = require('crypto');

const db = admin.firestore();
db.settings({ignoreUndefinedProperties: true});

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
    postalcode: data.userData.postal_code || '0000',
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

  /*Skribble*/

  let token = await loginSkribble();
  console.log('Skribble Token: ' + token);

  const file = await owllyPDF.download({});
  const signatureRequest = await createSignatureRequest(file[0].toString('base64'), token, data.owllyData.title, data.userData['email'] || '');

  console.log('signatureRequest: ' + JSON.stringify(signatureRequest));
  const signedFile = await downloadSignedPdf(signatureRequest, token);

  console.log('signedFileFromSkribble here');

  //SAVE SKRIBBLE FILE TO FIREBASE STORAGE
  await admin
    .storage()
    .bucket()
    .file('skribble/' + tempOwllyDoc.id + '/' + data.owllyData.filename + '.pdf', {})
    .save(signedFile);

  //GET SIGNED URL LINK from SKRIBBLE FILE
  const skribbleSignedUrl = await admin
    .storage()
    .bucket()
    .file('skribble/' + tempOwllyDoc.id + '/' + data.owllyData.filename + '.pdf', {})
    .getSignedUrl({
      action: 'read',
      expires: '2099-12-31', //TODO: CHANGE THIS!!!!
    });

  return {
    url: signedURL[0],
    message: '',
    status: {
      owlly: true,
      ots: true,
      skribble: true,
    },
    skribble: {
      signatureRequest: signatureRequest,
      documentId: signatureRequest.document_id,
      skribbleSignedUrl: skribbleSignedUrl,
      skribbleSigning_url: signatureRequest.signing_url,
    },
  };
}
