import * as functions from 'firebase-functions';

import 'firebase-functions/lib/logger/compat';

import {getOwlly} from './request/owlly/owlly.get';

export const owlly = functions.https.onRequest(getOwlly);

export const mailbox = functions.https.onRequest((req: any, res: any) => {});

export const generatePDF = functions.https.onRequest((req: any, res: any) => {
  //Todo JONATHAN
});
