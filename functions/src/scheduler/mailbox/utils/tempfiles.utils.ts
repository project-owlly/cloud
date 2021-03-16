//import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function readTempFiles() {
  let tempfiles = await db
    .collection('tempfiles')
    .where('statusReminder', '==', false)
    //.where('generated', '<', Date.now() - 1000 * 60 * 60)
    .get();
  tempfiles.forEach(async (file) => {
    if (file.data().data && file.data().data.email) {
      //GET LINK to File
      const signedTempfileUrl = await admin
        .storage()
        .bucket()
        .file('tempfiles/' + file.id + '/' + file.data().filename + '.pdf', {})
        .getSignedUrl({
          action: 'read',
          expires: '2099-12-31', //TODO: CHANGE THIS!!!!
        });

      if (file.data().skribble) {
        await sendReminderMail(file.data().data.email, file.data().data.given_name, file.data().skribbleSignedUrl);
      } else {
        await sendReminderMail(file.data().data.email, file.data().data.given_name, signedTempfileUrl[0]);
      }

      /*const tempfile = await admin
        .storage()
        .bucket()
        .file('tempfiles/' + file.id + '/' + file.data().filename + '.pdf', {})
        .get();*/
    }

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

function sendReminderMail(email: string, name: string, link: string) {
  return db.collection('mail').add({
    to: email,
    /*message: {
      attachments: attachments,
    },*/
    template: {
      name: 'sendReminder',
      data: {
        firstName: name,
        link: link,
      },
    },
  });
}
