import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

//admin.initializeApp(functions.config().firebase);
const db = admin.firestore();
export function authUserCreate(user: admin.auth.UserRecord, context: functions.EventContext) {
  //update
  db.collection('userProfile')
    .doc(`${user.uid}`)
    .set({
      email: user.email,
      id: user.uid,
      //status: true,
    })
    .then((ok) => {
      return 'ok';
    })
    .catch((e) => {
      return 'error';
    });
}

export function authUserCreateSendWelcomeMail(user: admin.auth.UserRecord, context: functions.EventContext) {
  return db.collection('mail').add({
    to: user.email,
    template: {
      name: 'userCreateWelcome',
    },
  });
}

export function authUserCreateSendVerifyMail(user: admin.auth.UserRecord, context: functions.EventContext) {
  //Send E-Mail that user has to verify his account first.
  if (!user.emailVerified) {
    return admin
      .auth()
      .generateEmailVerificationLink(user.email as string)
      .then((code: string) => {
        return db.collection('mail').add({
          to: user.email,
          template: {
            name: 'userCreateSendVerify',
            data: {
              code: code,
            },
          },
        });
      });
  } else {
    return;
  }
}
