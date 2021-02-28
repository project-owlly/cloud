//import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function readTempFiles() {
  await sendReminderMail('', '', '', []);
}

function sendReminderMail(email: string, name: string, hash: string, attachments: any[]) {
  return db.collection('mail').add({
    to: email,
    message: {
      attachments: attachments,
    },
    template: {
      name: 'inboxSuccess',
      data: {
        firstName: name,
        hash: hash,
      },
    },
  });
}
