import * as functions from 'firebase-functions';
import * as cors from 'cors';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

import {RequestError} from '../../types/request.error';
import {downloadSignedPdf, loginSkribble, getSignatureRequest, deleteDocument, deleteSignatureRequest} from '../../call/pdf/utils/skribble.utils';
import {readPdfMetaData, sendErrorMail, sendinboxSuccessAlready, sendSuccessMail} from './utils/skribble.utils';
const OpenTimestamps = require('opentimestamps');

export function callbackSuccess(request: functions.Request, response: functions.Response<any | RequestError>) {
  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      const tempFile = request.param('token');
      const document_id = request.param('document_id');
      const signature_request = request.param('signature_request');

      console.log(tempFile + ' - ' + document_id + ' - ' + signature_request);

      console.log('SUCCESS CALLBACK SKRIBBLE');

      if (!tempFile || !document_id || !signature_request) {
        response.end();
      }
      const token = await loginSkribble();
      console.log('skribble: login done ' + token);
      const signatureRequest = await getSignatureRequest(signature_request, token);
      console.log('skribble signature request: ' + JSON.stringify(signatureRequest));
      const documentBase64 = (await downloadSignedPdf(document_id, token)) as string;
      console.log('skribble: download document done');

      const documentBuffer = Buffer.from(documentBase64, 'base64'); //convert arraybuffer to buffer
      const pdfMetadata: any = await readPdfMetaData(documentBuffer, signatureRequest.title + '_signiert.pdf'); //TODO: check this?

      if (pdfMetadata && pdfMetadata.owllyId && pdfMetadata.fileId) {
        //Get Temp File from "request" -> should be YES
        const docUnsigned: FirebaseFirestore.DocumentData = await db.collection('tempfiles').doc(pdfMetadata.fileId).get();
        //check if already signed?
        const allreadySigned = await db.collectionGroup('files').where('eId', '==', pdfMetadata.eId).where('owllyId', '==', pdfMetadata.owllyId).get();

        if (docUnsigned.exists && !docUnsigned.data().statusSigned && allreadySigned.empty) {
          //nur falls auch wirklich noch kein signiertes vorhanden ist UND ein Request erstellt wurde.
          console.log('upload file! ' + docUnsigned.data().filename + '.pdf');

          const importDate = new Date();
          const postalCode = docUnsigned.data().postalcode;

          //SAVE ORIGINAL SIGNED FILE TO FIREBASE STORAGE
          await admin
            .storage()
            .bucket()
            .file('owlly/' + pdfMetadata.owllyId + '/' + docUnsigned.id + '/' + docUnsigned.data().filename + '.pdf', {})
            .save(documentBase64, {
              contentType: 'application/pdf',
            });

          //GET LINK
          const signedFileUrl = await admin
            .storage()
            .bucket()
            .file('owlly/' + pdfMetadata.owllyId + '/' + docUnsigned.id + '/' + docUnsigned.data().filename + '.pdf', {})
            .getSignedUrl({
              action: 'read',
              expires: '2099-12-31', //TODO: CHANGE THIS!!!!
            });

          //const file = Buffer.from(document, 'binary');
          const detached = OpenTimestamps.DetachedTimestampFile.fromBytes(new OpenTimestamps.Ops.OpSHA256(), documentBuffer);
          const infoResult = OpenTimestamps.info(detached);

          //TIMESTAMP
          await OpenTimestamps.stamp(detached);
          const fileOts = detached.serializeToBytes();

          //SAVE TIMESTAMPED FILE TO FIREBASE STORAGE

          await admin
            .storage()
            .bucket()
            .file('owlly/' + pdfMetadata.owllyId + '/' + docUnsigned.id + '/' + docUnsigned.data().filename + '.ots', {})
            .save(fileOts);

          //GET SIGNED URL LINK from TIMESTAMPED FILE
          const opentimestampsFileUrl = await admin
            .storage()
            .bucket()
            .file('owlly/' + pdfMetadata.owllyId + '/' + docUnsigned.id + '/' + docUnsigned.data().filename + '.ots', {})
            .getSignedUrl({
              action: 'read',
              expires: '2099-12-31', //TODO: CHANGE THIS!!!!
            });

          // SAVE Signed document URL entry in DB under Tempfiles
          // TODO THIS CAN BE DELETED -> WE DO IT ANYWAY FURTHER DOWN and we delete it later
          const hash = String(infoResult).split('File sha256 hash: ')[1].split('Timestamp:')[0];
          await db
            .collection('tempfiles')
            .doc(docUnsigned.id)
            .set(
              {
                statusSigned: true,
                imported: importDate,
                firebasestorage: signedFileUrl[0],
                opentimestamps: opentimestampsFileUrl[0],
                opentimestampsInfo: String(infoResult),
                hash: hash,
              },
              {
                merge: true,
              }
            );

          // SAVE to POSTALCODE
          await db.collection('owlly').doc(pdfMetadata.owllyId).collection('postalcode').doc(String(postalCode)).collection('files').add({
            certified: false,
            postalCode: postalCode,
            imported: importDate,
            generated: docUnsigned.data().generated,
            firebasestorage: signedFileUrl[0],
            opentimestamps: opentimestampsFileUrl[0],
            hash: hash,
            eId: pdfMetadata.eId,
            owllyId: pdfMetadata.owllyId,
            fileId: pdfMetadata.fileId,
            data: docUnsigned.data().data,
          });

          //keep that to inform user, that he already signed.
          //await db.collection('owlly-admin').doc(pdfMetadata.owllyId).collection('unsigned').doc(pdfMetadata.eId).delete();
          await sendSuccessMail(
            signatureRequest.signatures[0].signer_email_address,
            docUnsigned.data().data.given_name + ' ' + docUnsigned.data().data.family_name,
            hash,
            [
              /*  {
                filename: docUnsigned.data().filename + '.ots',
                content: fileOts,
              },*/
              {
                filename: docUnsigned.data().filename + '.pdf',
                content: documentBase64,
                encoding: 'base64',
                contentType: 'application/pdf',
              },
            ]
          );

          //counter on initiative
          const increment = admin.firestore.FieldValue.increment(1);
          await db.collection('owlly').doc(pdfMetadata.owllyId).set(
            {
              owllySigned: increment,
            },
            {
              merge: true,
            }
          );
          //counter on postalcode
          await db.collection('owlly').doc(pdfMetadata.owllyId).collection('postalcode').doc(String(postalCode)).set(
            {
              owllySigned: increment,
            },
            {
              merge: true,
            }
          );

          //Delete temp file & db entry
          await admin
            .storage()
            .bucket()
            .file('tempfiles/' + docUnsigned.id + '/' + docUnsigned.data().filename + '.pdf', {})
            .delete();
          await db.collection('tempfiles').doc(docUnsigned.id).delete();

          response.end();
        } else if (!allreadySigned.empty) {
          // THIS MEANS, THIS USER SIGNED ALREADY THIS INITIATIVE -> THerefore we have an entry in /owllyid/postalcode/8200/files
          console.log(pdfMetadata.owllyId + ' already signed by ' + pdfMetadata.eId + '(owlly-error-003)');
          await sendinboxSuccessAlready(
            signatureRequest.signatures[0].signer_email_address,
            docUnsigned.data().data.given_name + ' ' + docUnsigned.data().data.family_name
          );

          //delete document Skribble
          await deleteDocument(document_id, token);
          await deleteSignatureRequest(signature_request, token);

          //Delete file owlly
          await admin
            .storage()
            .bucket()
            .file('tempfiles/' + pdfMetadata.fileId, {})
            .delete();
          await db.collection('tempfiles').doc(pdfMetadata.fileId).delete();
        } else if (!docUnsigned.exist) {
          console.error('someone is doing strange stuff? No request (= no plain pdf was generated for this user) exists. (owlly-error-002)');
          await sendErrorMail(
            signatureRequest.signatures[0].signer_email_address,
            docUnsigned.data().data.given_name + ' ' + docUnsigned.data().data.family_name,
            'PDF generation error. Please create a new document. (owlly-error-002)'
          );
          await sendErrorMail('hi@owlly.ch', 'owlly IT-Department (owlly-error-002)', JSON.stringify(pdfMetadata));
        } else if (docUnsigned.exists && docUnsigned.data().statusSigned) {
          //THIS MEANS, WE HAVE A TEMP FILE. SHOULD NOT OCCUR.
          console.log(pdfMetadata.owllyId + ' already signed by ' + pdfMetadata.eId + '(owlly-error-003)');
          console.log('THIS SHOULD NOT OCCUR???? CHECK in LOGS');
          await sendinboxSuccessAlready(
            signatureRequest.signatures[0].signer_email_address,
            docUnsigned.data().data.given_name + ' ' + docUnsigned.data().data.family_name
          );
          //Delete file
          await admin
            .storage()
            .bucket()
            .file('tempfiles/' + docUnsigned.id + '/' + docUnsigned.data().filename + '.pdf', {})
            .delete();
          await db.collection('tempfiles').doc(docUnsigned.id).delete();
        } else {
          console.error('Strange error, check logs.  (owlly-error-005)');
          await sendErrorMail('hi@owlly.ch', 'owlly IT-Department (owlly-error-004)', 'Strange error, check logs.  (owlly-error-005)');
        }
      } else {
        response.end();
      }

      response.end();
    } catch (err) {
      console.error(JSON.stringify(err));
      response.end();
    }
  });
}
export function callbackUpdate(request: functions.Request, response: functions.Response<any | RequestError>) {
  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      const tempFile = request.param('token');
      const document_id = request.param('document_id');
      const signature_request = request.param('signature_request');

      console.log(tempFile + ' - ' + document_id + ' - ' + signature_request);
      console.log('UPDATE CALLBACK SKRIBBLE');
      response.end();
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}

export function callbackError(request: functions.Request, response: functions.Response<any | RequestError>) {
  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      const tempFile = request.param('token');
      const document_id = request.param('document_id');
      const signature_request = request.param('signature_request');

      console.log(tempFile + ' - ' + document_id + ' - ' + signature_request);
      console.log('ERROR CALLBACK SKRIBBLE');
      response.end();
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}
