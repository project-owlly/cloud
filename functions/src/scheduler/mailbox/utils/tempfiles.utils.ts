//import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function readTempFiles() {
  let tempfiles = await db
    .collection('tempfiles')
    .where('statusReminder', '==', false)
    .where('generated', '<', Date.now() - 1000 * 60 * 60)
    .get();
  tempfiles.forEach(async (file) => {
    //GET LINK
    const signedTempfileUrl = await admin
      .storage()
      .bucket()
      .file('tempfile/' + file.id + '/' + file.data().filename + '.pdf', {})
      .getSignedUrl({
        action: 'read',
        expires: '2099-12-31', //TODO: CHANGE THIS!!!!
      });

    const tempfile = await admin
      .storage()
      .bucket()
      .file('tempfile/' + file.id + '/' + file.data().filename + '.pdf', {})
      .get();

    await sendReminderMail(file.data().email, file.data().data.given_name, signedTempfileUrl[0], [tempfile[0]]);

    //Todo: DELETE DATA!
    await db.collection('tempfiles').doc(file.id).set(
      {
        statusReminder: true,
      },
      {
        merge: true,
      }
    );
  });
}

function sendReminderMail(email: string, name: string, link: string, attachments: any[]) {
  return db.collection('mail').add({
    to: email,
    message: {
      attachments: attachments,
    },
    template: {
      name: 'sendReminder',
      data: {
        firstName: name,
        link: link,
      },
    },
  });
}
