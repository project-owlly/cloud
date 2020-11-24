import * as functions from 'firebase-functions';

import * as imap from 'imap-simple';

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
}

export async function readMailboxPdfs(): Promise<string[]> {
  const attachments: MailData[] | null = await readMailbox();

  if (!attachments || attachments.length <= 0) {
    return [];
  }

  for (const attachement of attachments) {
    const signatures = getSignatures(attachement.data);
    if (signatures.length >= 1) {
      console.log('>>>>> signature ok');
      console.log(JSON.stringify(signatures[0]));

      const signature = await checkRevocation(signatures[0]);
      console.log(signature);
    } else {
      console.log('>>>>> signature NOT ok');
    }
  }

  const owllyIds: string[] = await readPdfOwllyIds(attachments);

  return owllyIds;
}

async function readMailbox(): Promise<MailData[] | null> {
  const connection: imap.ImapSimple = await imap.connect(config);

  await connection.openBox('INBOX');

  // Fetch emails from the last 30min
  const delay = 30 * 60 * 1000; // 24 * 60 * 60 *1000
  const yesterday = new Date();
  yesterday.setTime(Date.now() - delay);
  const yesterday2 = yesterday.toISOString();
  const searchCriteria = ['UNSEEN', ['SINCE', yesterday2]];
  const fetchOptions = {bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true};

  // retrieve only the headers of the messages
  const messages: imap.Message[] = await connection.search(searchCriteria, fetchOptions);

  if (!messages || messages.length <= 0) {
    return null;
  }

  let attachments: Promise<any>[] = [];

  messages.forEach((message: imap.Message) => {
    const parts = imap.getParts(message.attributes.struct as any);
    attachments = attachments.concat(
      parts
        .filter((part: any) => part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT')
        .filter((part: any) => {
          const split: string[] = part.disposition.params && part.disposition.params.filename && part.disposition.params.filename.split('.').reverse();
          return split && split.length > 0 && 'pdf' === split[0].toLowerCase();
        })
        .map((part: any) => {
          // retrieve the attachments only of the messages with attachments
          return connection.getPartData(message, part).then(function (partData: any) {
            return {
              filename: part.disposition.params.filename,
              data: partData,
            };
          });
        })
    );
  });

  if (attachments.length <= 0) {
    return null;
  }

  return await Promise.all(attachments);
}

function extractOwllyId(pdf: string): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const loadingTask: PDFLoadingTask<PDFDocumentProxy> = pdfjsLib.getDocument(pdf);

    loadingTask.promise.then(
      async (doc) => {
        const metadata: {info: PDFInfo; metadata: PDFMetadata} = await doc.getMetadata();

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

async function writeFile(data: MailData): Promise<string> {
  const output: string = path.join(os.tmpdir(), data.filename);
  await fs.writeFile(output, data.data, 'utf8');

  return output;
}

async function readPdfOwllyId(data: MailData): Promise<string | null> {
  const pdf: string = await writeFile(data);

  return await extractOwllyId(pdf);
}

async function readPdfOwllyIds(attachments: MailData[]): Promise<string[]> {
  const owllyIds: (string | null)[] = await Promise.all(attachments.map((d: MailData) => readPdfOwllyId(d)));

  if (!owllyIds || owllyIds.length <= 0) {
    return [];
  }

  return owllyIds.filter((owllyId: string | null) => owllyId !== null) as string[];
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
