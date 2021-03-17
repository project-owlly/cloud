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
    if (file.exists && file.data().data && file.data().data.email) {
      if (file.data().skribble) {
        await sendReminderMail(file.data().data.email, file.data().data.given_name, file.data().skribbleSigningUrl);
      } else {
        await sendReminderMail(file.data().data.email, file.data().data.given_name, file.data().firebasestorage);
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

    //Todo: DELETE DATA!?? check this,.. we do a clean up if we receive the file!!!
    /*
    await db.collection('tempfiles').doc(file.id).delete();
    await admin
    .storage()
    .bucket()
    .file('tempfiles/' + file.id + file.data().filename + '.pdf', {}).delete();
    */

    //TODO: Clean up "old" entries
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
