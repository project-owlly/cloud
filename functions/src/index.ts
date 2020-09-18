import * as functions from 'firebase-functions';
import 'firebase-functions/lib/logger/compat';

import {getOwlly} from './request/owlly/owlly.get';
import {mailboxPost} from './request/mailbox/mailbox.post';

export const owlly = functions.region('europe-west6').https.onRequest(getOwlly);

export const mailbox = functions.region('europe-west6').https.onRequest(mailboxPost);

export const generatePDF = functions.region('europe-west6').https.onRequest((req: any, res: any) => {
  //Todo JONATHAN
});
