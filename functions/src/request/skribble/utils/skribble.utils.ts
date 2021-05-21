import * as admin from 'firebase-admin';

const db = admin.firestore();
const pdfjsLib = require('pdfjs-dist/es5/build/pdf.js');

import {PDFDocumentProxy, PDFInfo, PDFLoadingTask, PDFMetadata} from 'pdfjs-dist';

import {promises as fs} from 'fs';
import * as path from 'path';
import * as os from 'os';

export function extractOwllyId(pdf: string): Promise<string | null> {
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

export function extractEid(pdf: string): Promise<string | null> {
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

export function extractFileId(pdf: string): Promise<string | null> {
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

export async function readPdfMetaData(data: Buffer, filename: string): Promise<any | null> {
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

export async function sendErrorMail(email: string, name: string, errorMessage: string) {
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

export async function sendSuccessMail(email: string, name: string, hash: string, attachments: any[]) {
  await db
    .collection('templates')
    .doc('inboxSuccess')
    .set(
      {
        attachments: [
          {
            filename: '{{PDFfilename}}',
            content: '{{PDFcontent}}',
            encoding: '{{PDFencoding}}',
            contentType: '{{PDFcontentType}}',
          },
          {
            filename: '{{OTSfilename}}',
            content: '{{OTScontent}}',
            encoding: '{{OTSencoding}}',
          },
        ],
      },
      {
        merge: true,
      }
    );

  return db.collection('mail').add({
    to: email,
    template: {
      name: 'inboxSuccess',
      data: {
        firstName: name,
        hash: hash,

        PDFfilename: attachments[0].filename,
        PDFcontent: attachments[0].content,
        PDFencoding: attachments[0].encoding,
        PDFcontentType: attachments[0].contentType,

        OTSfilename: attachments[1].filename,
        OTScontent: attachments[1].content,
        OTSencoding: attachments[1].encoding,
      },
    },
  });
}

export function sendinboxSuccessAlready(email: string, name: string) {
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
