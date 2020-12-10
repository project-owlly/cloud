import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as imap from 'imap-simple';
//import { format } from 'date-fns';

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
  console.log('>>> READ MAILBOX');

  const attachments: MailData[] | null = await readMailbox();

  if (!attachments || attachments.length <= 0) {
    return [];
  }

  console.log('>>> SIGNATURE');

  for (const attachment of attachments) {
    console.log('loop over mails with attachment from: ' + attachment.from + ' email: ' + attachment.email);
    const signatures = getSignatures(attachment.data);
    if (signatures.length >= 1) {
      console.log('>>> >>> signature ok');
      //console.log(JSON.stringify(signatures[0]));

      const signature: any = checkRevocation(signatures[0]);
      if (signature.sig || signature.err) {
        console.log('>>> >>> revocation issue');
      } else {
        console.log('>>> >>> revocation status good');

        const pdfMetadata: any = await readPdfMetaData(attachment);

        const docSigned: FirebaseFirestore.DocumentData = await db
          .collection('owlly-admin')
          .doc(pdfMetadata.owllyId)
          .collection('signed')
          .doc(pdfMetadata.eId)
          .get();
        const docUnsigned: FirebaseFirestore.DocumentData = await db
          .collection('owlly-admin')
          .doc(pdfMetadata.owllyId)
          .collection('signed')
          .doc(pdfMetadata.eId)
          .get();

        if (!docSigned.exists && docUnsigned.exists) {
          //nur falls auch wirklich noch kein signierted vorhanden ist UND ein Request erstellt wurde.
          console.log('upload file! ' + attachment.filename);

          //save FILE
          await admin
            .storage()
            .bucket()
            .file('signed/' + pdfMetadata.owllyId + '/' + pdfMetadata.eId + '/' + attachment.filename, {})
            .save(attachment.data);

          //GET LINK
          const signedFileUrl = await admin
            .storage()
            .bucket()
            .file('signed/' + pdfMetadata.owllyId + '/' + pdfMetadata.eId + '/' + attachment.filename, {})
            .getSignedUrl({
              action: 'read',
              expires: '2099-12-31',
            });

          //SAVE Signed document entry in DB
          await db.collection('owlly-admin').doc(pdfMetadata.owllyId).collection('signed').doc(pdfMetadata.eId).set({
            imported: new Date(),
            fileUrl: signedFileUrl,
          });

          const postalCode = docUnsigned.data().postal_code;
          await db.collection('owlly-campaigner').doc(pdfMetadata.owllyId).collection(String(postalCode)).add({
            imported: new Date(),
            fileUrl: signedFileUrl,
            status: 'open',
          });
        } else {
          if (!docUnsigned.exists) {
            console.error('someone is doing strange stuff');
          } else {
            console.error(pdfMetadata.owllyId + ' already signed by ' + pdfMetadata.eId);
          }
        }
      }

      //console.log(signature);
    } else {
      console.log('>>> >>> signature NOT ok');
    }
  }

  console.log('>>> OWLLYID ');
  //const owllyIds: string[] = await readPdfOwllyIds(attachments);
  return;
  //return owllyIds;
}

async function readMailbox(): Promise<MailData[] | null> {
  try {
    const connection: imap.ImapSimple = await imap.connect(config);

    await connection.openBox('INBOX').catch((err) => {
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
    const messages: imap.Message[] = await connection.search(searchCriteria, fetchOptions);

    if (!messages || messages.length <= 0) {
      console.log('No E-Mails on Server found');

      connection.end();
      return null;
    }

    let attachments: MailData[] = [];

    for (const message of messages) {
      try {
        const parts = imap.getParts(message.attributes.struct as any);
        const attachmentPart: any = parts
          .filter((part: any) => part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT')
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
        await connection.addFlags(String(message.attributes.uid), '\\Deleted');
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

async function writeFile(data: MailData): Promise<string> {
  const output: string = path.join(os.tmpdir(), data.filename);
  await fs.writeFile(output, data.data, 'utf8');

  return output;
}

async function readPdfMetaData(data: MailData): Promise<any | null> {
  const pdf: string = await writeFile(data);

  const owllyId: string | null = await extractOwllyId(pdf);
  const eId: string | null = await extractEid(pdf);

  return {owllyId: owllyId, eId: eId};
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

/*function sendSuccessMail(email: string, name: string) {
  return db.collection('mail').add({
    to: email,
    template: {
      name: 'inboxSuccess',
      data: {
        firstName: name,
      },
    },
  });
}*/

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
