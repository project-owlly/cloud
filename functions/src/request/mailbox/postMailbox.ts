import * as functions from 'firebase-functions';

import * as imap from 'imap-simple';

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

export async function postMailbox(request: functions.Request, response: functions.Response<any>): Promise<void> {
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

  response.json({result: 'success'});
}
