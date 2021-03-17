import {CallableContext} from 'firebase-functions/lib/providers/https';
import * as admin from 'firebase-admin';

import {generatePDFDoc} from './utils/pdf.utils';
import {createSignatureRequest, loginSkribble} from './utils/skribble.utils';

const crypto = require('crypto');

const db = admin.firestore();
db.settings({ignoreUndefinedProperties: true});

interface OwllyDocumentInfo extends PDFKit.DocumentInfo {
  OwllyId: string;
  Eid: string;
  FileId: string;
}

export async function callGeneratePdfUrl(data: any, context: CallableContext): Promise<any | undefined> {
  let statusOwlly: boolean = true;
  let statusOTS: boolean = true;
  let statusSkribble: boolean = true;
  let signingUrl: string = '';

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

  const postalcode = data.userData.postal_code || '0000';

  // Make entry in DB
  const tempOwllyDoc = await db.collection('tempfiles').add({
    generated: new Date(),
    postalcode: postalcode,
    statusSigned: false,
    statusReminder: false,
    owllyId: owllyId,
    eId: eId,
    filename: data.owllyData.filename,
    data: data.userData, //TOOD: Hash IT?
    email: data.userData['email'] || '', //TODO: could be removed? we have it in userdata
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

  await db.collection('owlly').doc(owllyId).collection('postalcode').doc(String(postalcode)).set(
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
  });

  /*Skribble*/
  if (data.userData.configuration === 'zg' || data.userData.configuration === 'sh') {
    let token = await loginSkribble();
    //console.log('Skribble Token: ' + token);

    //const file = await owllyPDF.download({});
    //const signatureRequest = await createSignatureRequest(file[0].toString('base64'), token, data.owllyData.title, data.userData['email'] || '');

    signingUrl = await createSignatureRequest(signedURL[0], token, data.owllyData.title, data.userData['email'] || '', tempOwllyDoc.id);

    await db.collection('tempfiles').doc(tempOwllyDoc.id).set(
      {
        skribble: true,
        skribbleSigningUrl: signingUrl,
        firebasestorage: signedURL[0],
      },
      {
        merge: true,
      }
    );

    //console.log('signatureRequest: ' + JSON.stringify(signatureRequest));

    /*
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
      */
  } else {
    // THIS CASE IS NOT USED ANYMORE. Sign with SKRIBBLE ANYWAY!
    await db.collection('tempfiles').doc(tempOwllyDoc.id).set(
      {
        skribble: false,
        firebasestorage: signedURL[0],
      },
      {
        merge: true,
      }
    );
    statusSkribble = false;
  }

  return {
    url: signedURL[0],
    message: '',
    configuration: data.userData.configuration,
    status: {
      owlly: statusOwlly,
      ots: statusOTS,
      skribble: statusSkribble,
    },
    skribbleSigningUrl: signingUrl + '?exitURL=https%3A%2F%2Fowlly.ch%2Ffinish%2F' + owllyId + '&redirectTimeout=10&hidedownload=true',
    skribble: {
      //signatureRequest: signatureRequest,
      //documentId: signatureRequest.document_id,
      skribbleSigningUrl: signingUrl + '?exitURL=https%3A%2F%2Fowlly.ch%2Ffinish%2F' + owllyId + '&redirectTimeout=10&hidedownload=true',
    },
  };
}
