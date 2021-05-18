import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

var imaps = require('imap-simple');
const OpenTimestamps = require('opentimestamps');

const db = admin.firestore();
const pdfjsLib = require('pdfjs-dist/es5/build/pdf.js');

import {PDFDocumentProxy, PDFInfo, PDFLoadingTask, PDFMetadata} from 'pdfjs-dist';

import {promises as fs} from 'fs';
import * as path from 'path';
import * as os from 'os';
import {getSignatures} from './parser.utils';
import {checkRevocation} from './revocation.utils';

/* MAILBOX */
const config = {
  imap: {
    user: functions.config().mailbox.user,
    password: functions.config().mailbox.password,
    host: 'imap.mail.hostpoint.ch',
    port: 993,
    tls: true,
    authTimeout: 3000,
  },
};

interface MailData {
  filename: string;
  data: Buffer;
  from: string;
  email: string;
}

export async function readMailboxPdfs() {
  const attachments: MailData[] | null = await readMailbox();
  if (!attachments || attachments.length <= 0) {
    return [];
  }

  for (const attachment of attachments) {
    const signatures = getSignatures(attachment.data);
    if (signatures.length >= 1) {
      const signature: any = checkRevocation(signatures[0]);
      if (signature.sig || signature.err) {
        console.error('>>> >>> revocation issue  (owlly-error-010)');
        await sendErrorMail(attachment.email, attachment.from, 'File not signed by valid eID+. (owlly-error-010)');
      } else {
        const pdfMetadata: any = await readPdfMetaData(attachment.data, attachment.filename);

        if (pdfMetadata && pdfMetadata.owllyId && pdfMetadata.fileId) {
          //Get Temp File from "request" -> should be YES
          const docUnsigned: FirebaseFirestore.DocumentData = await db.collection('tempfiles').doc(pdfMetadata.fileId).get();
          const allreadySigned = await db.collectionGroup('files').where('eId', '==', pdfMetadata.eId).where('owllyId', '==', pdfMetadata.owllyId).get();

          if (docUnsigned.exists && !docUnsigned.data().statusSigned && allreadySigned.empty) {
            //nur falls auch wirklich noch kein signiertes vorhanden ist UND ein Request erstellt wurde.
            console.log('upload file! ' + attachment.filename);

            const importDate = new Date();
            const postalCode = docUnsigned.data().postalcode;

            //SAVE ORIGINAL SIGNED FILE TO FIREBASE STORAGE
            await admin
              .storage()
              .bucket()
              .file('owlly/' + pdfMetadata.owllyId + '/' + docUnsigned.id + '/' + docUnsigned.data().filename + '.pdf', {})
              .save(attachment.data);

            //GET LINK
            const signedFileUrl = await admin
              .storage()
              .bucket()
              .file('owlly/' + pdfMetadata.owllyId + '/' + docUnsigned.id + '/' + docUnsigned.data().filename + '.pdf', {})
              .getSignedUrl({
                action: 'read',
                expires: '2099-12-31', //TODO: CHANGE THIS!!!!
              });

            // TIMESTAMP MAGIC
            //FILE = attachment.data
            const detached = OpenTimestamps.DetachedTimestampFile.fromBytes(new OpenTimestamps.Ops.OpSHA256(), attachment.data);
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
            await sendSuccessMail(attachment.email, attachment.from, hash, [
              {
                filename: docUnsigned.data().filename + '.ots',
                content: fileOts,
              },
              {
                filename: docUnsigned.data().filename + '.pdf',
                content: attachment.data,
              },
            ]);

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
          } else if (!allreadySigned.empty) {
            // THIS MEANS, THIS USER SIGNED ALREADY THIS INITIATIVE -> THerefore we have an entry in /owllyid/postalcode/8200/files
            console.log(pdfMetadata.owllyId + ' already signed by ' + pdfMetadata.eId + '(owlly-error-003)');
            await sendinboxSuccessAlready(attachment.email, attachment.from);

            //Delete file
            await admin
              .storage()
              .bucket()
              .file('tempfiles/' + pdfMetadata.fileId, {})
              .delete();
            await db.collection('tempfiles').doc(pdfMetadata.fileId).delete();
          } else if (!docUnsigned.exist) {
            console.error('someone is doing strange stuff? No request (= no plain pdf was generated for this user) exists. (owlly-error-002)');
            await sendErrorMail(attachment.email, attachment.from, 'PDF generation error. Please create a new document. (owlly-error-002)');
            await sendErrorMail('hi@owlly.ch', 'owlly IT-Department (owlly-error-002)', JSON.stringify(pdfMetadata));
          } else if (docUnsigned.exists && docUnsigned.data().statusSigned) {
            //THIS MEANS, WE HAVE A TEMP FILE. SHOULD NOT OCCUR.
            console.log(pdfMetadata.owllyId + ' already signed by ' + pdfMetadata.eId + '(owlly-error-003)');
            console.log('THIS SHOULD NOT OCCUR???? CHECK in LOGS');
            await sendinboxSuccessAlready(attachment.email, attachment.from);
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
          return;
        }
      }
    } else {
      console.error('>>> >>> signature NOT ok  (owlly-error-020)');
      await sendErrorMail(attachment.email, attachment.from, 'Signature is not valid. (owlly-error-020)');
    }
  }
  return;
}

async function readMailbox(): Promise<MailData[] | null> {
  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX').catch((err: any) => {
      console.error('Error: ' + err.message);
    });

    // Fetch emails from the last 30min
    const delay = 30 * 60 * 1000; // 24 * 60 * 60 *1000
    const yesterday = new Date(Date.now() - new Date().getTimezoneOffset() * 60 * 1000 - delay).toISOString();

    console.log('READ Mail since: ' + yesterday);
    const searchCriteria = ['UNSEEN', ['SINCE', yesterday]];
    const fetchOptions = {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      struct: true,
    };

    // retrieve only the headers of the messages
    const messages = await connection.search(searchCriteria, fetchOptions);

    if (!messages || messages.length <= 0) {
      console.log('No E-Mails on Server found');

      connection.end();
      return null;
    }

    let attachments: MailData[] = [];

    for (const message of messages) {
      try {
        const parts = imaps.getParts(message.attributes.struct);
        const attachmentPart: any = parts
          .filter((part: any) => part.disposition && (part.disposition.type.toUpperCase() === 'ATTACHMENT' || part.disposition.type.toUpperCase() === 'INLINE'))
          .filter((part: any) => {
            const split: string[] = part.disposition.params && part.disposition.params.filename && part.disposition.params.filename.split('.').reverse();
            return split && split.length > 0 && 'pdf' === split[0].toLowerCase();
          });

        //console.log('attachmentPart: ' + JSON.stringify(attachmentPart));

        if (attachmentPart.length <= 0) {
          console.log('No matching attachment in email found (owlly-error-001)');
          await sendErrorMail(
            message.parts[0].body.from[0].match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi)[0],
            message.parts[0].body.from[0].split(' ')[0],
            'No matching attachment in email found (owlly-error-001)'
          );
        } else {
          const partData: any = await connection.getPartData(message, attachmentPart[0]);

          const attachment: MailData = {
            filename: attachmentPart[0].disposition.params.filename,
            data: partData,
            from: message.parts[0].body.from[0].split(' ')[0],
            email: message.parts[0].body.from[0].match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi)[0],
          };

          attachments = attachments.concat(attachment);
        }
        //Message löschen (Falls später die Signatur falsch ist, kann eine E-Mail gesendet werden.)

        //connection.addFlags(String(message.attributes.uid), "\Deleted");
        await connection.deleteMessage([message.attributes.uid]);

        //await connection.moveMessage(String(message.attributes.uid), 'Deleted');
      } catch (err) {
        console.error('General attachment error (owlly-error-001) ' + JSON.stringify(err.message));

        console.log('Email dump from: ' + JSON.stringify(message.parts[0].body.from));
        console.log('Email dump body: ' + JSON.stringify(message.parts[0].body));

        await sendErrorMail('hi@owlly.ch', 'owlly IT-Department (owlly-error-001)', 'General attachment error (owlly-error-001)');
      }
    }

    connection.end();

    if (attachments.length <= 0) {
      console.log(`No Attachments in ${messages.length} E-Mail(s) found`);
      return null;
    }

    return await Promise.all(attachments);
  } catch (err) {
    console.log('Error: ' + err.message + JSON.stringify(err));

    return null;
  }
}

function extractOwllyId(pdf: string): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const loadingTask: PDFLoadingTask<PDFDocumentProxy> = pdfjsLib.getDocument(pdf);

    loadingTask.promise.then(
      async (doc) => {
        const metadata: {
          info: PDFInfo;
          metadata: PDFMetadata;
        } = await doc.getMetadata();

        const owllyId: string | null =
          metadata && metadata.info && metadata.info.Custom && metadata.info.Custom.OwllyId !== undefined ? metadata.info.Custom.OwllyId : null;

        resolve(owllyId);
      },
      (err) => {
        console.error(err);
        resolve(null);
      }
    );
  });
}

function extractEid(pdf: string): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const loadingTask: PDFLoadingTask<PDFDocumentProxy> = pdfjsLib.getDocument(pdf);

    loadingTask.promise.then(
      async (doc) => {
        const metadata: {
          info: PDFInfo;
          metadata: PDFMetadata;
        } = await doc.getMetadata();

        const eId: string | null =
          metadata && metadata.info && metadata.info.Custom && metadata.info.Custom.Eid !== undefined ? metadata.info.Custom.Eid : null;

        resolve(eId);
      },
      (err) => {
        console.error(err);
        resolve(null);
      }
    );
  });
}

function extractFileId(pdf: string): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const loadingTask: PDFLoadingTask<PDFDocumentProxy> = pdfjsLib.getDocument(pdf);

    loadingTask.promise.then(
      async (doc) => {
        const metadata: {
          info: PDFInfo;
          metadata: PDFMetadata;
        } = await doc.getMetadata();

        const fileId: string | null =
          metadata && metadata.info && metadata.info.Custom && metadata.info.Custom.FileId !== undefined ? metadata.info.Custom.FileId : null;

        resolve(fileId);
      },
      (err) => {
        console.error(err);
        resolve(null);
      }
    );
  });
}

async function writeFile(data: Buffer, filename: string): Promise<string> {
  const output: string = path.join(os.tmpdir(), filename);
  await fs.writeFile(output, data, 'utf8');

  return output;
}

async function readPdfMetaData(data: Buffer, filename: string): Promise<any | null> {
  const pdf: string = await writeFile(data, filename);

  const owllyId: string | null = await extractOwllyId(pdf);
  const eId: string | null = await extractEid(pdf);
  const fileId: string | null = await extractFileId(pdf);

  return {
    owllyId: owllyId,
    eId: eId,
    fileId: fileId,
  };
}

/*
async function readPdfOwllyIds(attachments: MailData[]): Promise<string[]> {
  const owllyIds: (string | null)[] = await Promise.all(attachments.map((d: MailData) => readPdfMetaData(d)));

  if (!owllyIds || owllyIds.length <= 0) {
    return [];
  }

  return owllyIds.filter((owllyId: string | null) => owllyId !== null) as string[];
}*/

async function sendErrorMail(email: string, name: string, errorMessage: string) {
  await db.collection('mail').add({
    to: email,
    template: {
      name: 'inboxError',
      data: {
        firstName: name,
        errorMessage: errorMessage,
      },
    },
  });
}

function sendSuccessMail(email: string, name: string, hash: string, attachments: any[]) {
  return db.collection('mail').add({
    to: email,
    template: {
      name: 'inboxSuccess',
      data: {
        firstName: name,
        hash: hash,
        attachments: attachments,
      },
    },
    meesage: {
      attachments: attachments,
    },
    attachments: attachments,
  });
}

function sendinboxSuccessAlready(email: string, name: string) {
  return db.collection('mail').add({
    to: email,
    template: {
      name: 'inboxSuccessAlready',
      data: {
        firstName: name,
      },
    },
  });
}

// Test: run locally
// (async () => {
//   try {
//     const data: MailData[] | null = await readMailbox();
//
//     const owllyIds: string[] = await readPdfOwllyIds(data as MailData[]);
//
//     console.log('end', owllyIds);
//   } catch (e) {
//     console.error(e);
//   }
// })();
