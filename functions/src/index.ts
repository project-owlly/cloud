import * as functions from 'firebase-functions';
import 'firebase-functions/lib/logger/compat';

/* MAILBOX */
let imaps = require('imap-simple');
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

export const mailbox = functions.region('europe-west6').https.onRequest((req: any, res: any) => {
  imaps.connect(config).then(function (connection: any) {
    connection
      .openBox('INBOX')
      .then(function () {
        // Fetch emails from the last 24h
        let delay = 24 * 3600 * 1000;
        let yesterday = new Date();
        yesterday.setTime(Date.now() - delay);
        let yesterday2 = yesterday.toISOString();
        let searchCriteria = ['UNSEEN', ['SINCE', yesterday2]];
        let fetchOptions = {bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true};

        // retrieve only the headers of the messages
        return connection.search(searchCriteria, fetchOptions);
      })
      .then(function (messages: any) {
        let attachments = <any>[];

        messages.forEach(function (message: any) {
          let parts = imaps.getParts(message.attributes.struct);
          attachments = attachments.concat(
            parts
              .filter(function (part: any) {
                return part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT';
              })
              .map(function (part: any) {
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

        return Promise.all(attachments);
      })
      .then(function (attachments: any) {
        console.log(attachments);
        // =>
        //    [ { filename: 'cats.jpg', data: Buffer() },
        //      { filename: 'pay-stub.pdf', data: Buffer() } ]
      });
  });
});

export const generatePDF = functions.region('europe-west6').https.onRequest((req: any, res: any) => {
  //Todo JONATHAN
});
