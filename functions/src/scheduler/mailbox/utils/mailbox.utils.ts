import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
//import * as imaps from 'imap-simple';
//import {ImapSimple} from 'imap-simple'

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
import {exit} from 'process';

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
        const pdfMetadata: any = await readPdfMetaData(attachment);

        if (pdfMetadata && pdfMetadata.owllyId && pdfMetadata.fileId) {
          //Get Temp File from "request" -> should be YES
          const docUnsigned: FirebaseFirestore.DocumentData = await db.collection('tempfiles').doc(pdfMetadata.fileId).get();

          if (docUnsigned.exists && !docUnsigned.data().status) {
            //nur falls auch wirklich noch kein signiertes vorhanden ist UND ein Request erstellt wurde.
            console.log('upload file! ' + attachment.filename);

            const importDate = new Date();
            const postalCode = docUnsigned.data().postalcode;

            //SAVE ORIGINAL SIGNED FILE TO FIREBASE STORAGE
            await admin
              .storage()
              .bucket()
              .file('signed/' + docUnsigned.id + '/' + docUnsigned.data().filename, {})
              .save(attachment.data);

            //GET LINK
            const signedFileUrl = await admin
              .storage()
              .bucket()
              .file('signed/' + docUnsigned.id + '/' + docUnsigned.data().filename, {})
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
              .file('opentimestamps/' + docUnsigned.id + '/' + docUnsigned.data().filename, {})
              .save(fileOts);

            //GET LINK from TIMESTAMPED FILE
            const opentimestampsFileUrl = await admin
              .storage()
              .bucket()
              .file('opentimestamps/' + docUnsigned.id + '/' + docUnsigned.data().filename, {})
              .getSignedUrl({
                action: 'read',
                expires: '2099-12-31', //TODO: CHANGE THIS!!!!
              });

            //SAVE Signed document URL entry in DB under Tempfiles
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
                },
                {
                  merge: true,
                }
              );

            await db.collection('owlly-campaigner').doc(pdfMetadata.owllyId).collection(String(postalCode)).add({
              imported: importDate,
              firebasestorage: signedFileUrl[0],
              opentimestamps: opentimestampsFileUrl[0],
              status: 'open',
            });
            //keep that to inform user, that he already signed.
            //await db.collection('owlly-admin').doc(pdfMetadata.owllyId).collection('unsigned').doc(pdfMetadata.eId).delete();
            await sendSuccessMail(attachment.email, docUnsigned.data().given_name);
          } else if (!docUnsigned.exist) {
            console.error('someone is doing strange stuff? No request (= no plain pdf was generated for this user) exists. (owlly-error-002)');
            await sendErrorMail(attachment.email, attachment.from, 'PDF generation error. Please create a new document. (owlly-error-002)');
            await sendErrorMail('hi@owlly.ch', 'owlly IT-Department (owlly-error-002)', JSON.stringify(pdfMetadata));
          } else if (docUnsigned.exists && docUnsigned.data().status) {
            console.error(pdfMetadata.owllyId + ' already signed by ' + pdfMetadata.eId + '(owlly-error-003)');
            await sendErrorMail(attachment.email, attachment.from, 'File already received by owlly. No need to send it again :) . (owlly-error-003)');
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
            message.parts[0].body.from[0].split('<')[1].split('>')[0],
            message.parts[0].body.from[0].split('<')[0],
            'No matching attachment in email found (owlly-error-001)'
          );
        } else {
          const partData: any = await connection.getPartData(message, attachmentPart[0]);

          const attachment: MailData = {
            filename: attachmentPart[0].disposition.params.filename,
            data: partData,
            from: message.parts[0].body.from[0].split('<')[0],
            email: message.parts[0].body.from[0].split('<')[1].split('>')[0],
          };

          attachments = attachments.concat(attachment);
        }
        //Message löschen (Falls später die Signatur falsch ist, kann eine E-Mail gesendet werden.)

        //connection.addFlags(String(message.attributes.uid), "\Deleted");
        await connection.deleteMessage([message.attributes.uid]);

        //await connection.moveMessage(String(message.attributes.uid), 'Deleted');
      } catch (err) {
        console.error('General attachment error (owlly-error-002) ' + JSON.stringify(err.message));
        await sendErrorMail(
          message.parts[0].body.from[0].split('<')[1].split('>')[0],
          message.parts[0].body.from[0].split('<')[0],
          'General attachment error (owlly-error-002)'
        );
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

async function writeFile(data: MailData): Promise<string> {
  const output: string = path.join(os.tmpdir(), data.filename);
  await fs.writeFile(output, data.data, 'utf8');

  return output;
}

async function readPdfMetaData(data: MailData): Promise<any | null> {
  const pdf: string = await writeFile(data);

  const owllyId: string | null = await extractOwllyId(pdf);
  const eId: string | null = await extractEid(pdf);
  const fileId: string | null = await extractFileId(pdf);

  return {owllyId: owllyId, eId: eId, fileId: fileId};
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

function sendSuccessMail(email: string, name: string) {
  return db.collection('mail').add({
    to: email,
    template: {
      name: 'inboxSuccess',
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
