import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import {QueryDocumentSnapshot} from 'firebase-functions/lib/providers/firestore';

const db = admin.firestore();

export async function sendNewsletterWelcomeMail(snapshot: QueryDocumentSnapshot, context: functions.EventContext) {
  try {
    return db.collection('mail').add({
      to: snapshot.data().email,
      template: {
        name: 'newsletterWelcomeMail',
        data: {
          firstName: snapshot.data().vorname,
        },
      },
    });

    // TODO: function does nothing more than reading the mailbox, findings PDF and their related owllyIds
  } catch (err) {
    console.error(err);
    return false;
  }
}
