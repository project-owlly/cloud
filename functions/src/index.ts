import * as functions from 'firebase-functions';
import 'firebase-functions/lib/logger/compat';

import {getOwlly} from './request/owlly/owlly.get';
import {mailboxGet} from './request/mailbox/mailbox.get';
import {postGeneratePdf} from './request/pdf/pdf.post';
import {getOIDAuthUrl} from './request/oidc/getOIDC';
import {getEidData} from './request/oidc/getEidData';

import {readMailbox} from './scheduler/mailbox/mailbox.scheduler';

export const owlly = functions.region('europe-west6').https.onRequest(getOwlly);

export const mailbox = functions.region('europe-west6').https.onRequest(mailboxGet);

export const generatePDF = functions.region('europe-west6').https.onRequest(postGeneratePdf);

export const OIDAuthUrl = functions.region('europe-west6').https.onRequest(getOIDAuthUrl);

export const eidData = functions.region('europe-west6').https.onRequest(getEidData);

export const mailboxScheduler = functions.region('europe-west6').pubsub.schedule('every 15 minutes').onRun(readMailbox);
