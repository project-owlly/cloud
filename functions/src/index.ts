import * as functions from 'firebase-functions';
import 'firebase-functions/lib/logger/compat';

import * as imap from 'imap-simple';

/* MAILBOX */
let config = {
  imap: {
    user: functions.config().mailbox.user,
    password: functions.config().mailbox.password,
    host: 'imap.mail.hostpoint.ch',
    port: 993,
    tls: true,
    authTimeout: 3000,
  },
};

import {getOwlly} from './request/owlly/owlly.get';

export const owlly = functions.region('europe-west6').https.onRequest(getOwlly);

export const mailbox = functions.region('europe-west6').https.onRequest(async (req: any, res: any) => {
  const connection: imap.ImapSimple = await imap.connect(config);

  await connection.openBox('INBOX');

  // Fetch emails from the last 24h
  const delay = 24 * 3600 * 1000;
  const yesterday = new Date();
  yesterday.setTime(Date.now() - delay);
  const yesterday2 = yesterday.toISOString();
  const searchCriteria = ['UNSEEN', ['SINCE', yesterday2]];
  const fetchOptions = {bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true};

  // retrieve only the headers of the messages
  const messages: imap.Message[] = await connection.search(searchCriteria, fetchOptions);

  let attachments = <any>[];

  messages.forEach((message: imap.Message) => {
    const parts = imap.getParts(message.attributes.struct as any);
    attachments = attachments.concat(
      parts
        .filter((part: any) => part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT')
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

  await Promise.all(attachments);

  console.log(attachments);
});

export const generatePDF = functions.region('europe-west6').https.onRequest((req: any, res: any) => {
  //Todo JONATHAN
});
