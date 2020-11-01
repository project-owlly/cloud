import * as functions from 'firebase-functions';
import 'firebase-functions/lib/logger/compat';

import {getOwlly} from './request/owlly/owlly.get';
import {mailboxGet} from './request/mailbox/mailbox.get';
import {postGeneratePdf} from './request/pdf/pdf.post';
import {getOIDAuthUrl} from './request/oidc/getOIDC';
import {getEidData} from './request/oidc/getEidData';

import {readMailbox} from './scheduler/mailbox/mailbox.scheduler';

import {sendNewsletterWelcomeMail} from './firestore/newsletter/newsletter.create';
import {sendFeedbackThankYouMail} from './firestore/feedback/feedback.create';

//HTTP Requests
export const owlly = functions.region('europe-west6').https.onRequest(getOwlly);
export const mailbox = functions.region('europe-west6').https.onRequest(mailboxGet);
export const generatePDF = functions.region('europe-west6').https.onRequest(postGeneratePdf);
export const OIDAuthUrl = functions.region('europe-west6').https.onRequest(getOIDAuthUrl);
export const eidData = functions.region('europe-west6').https.onRequest(getEidData); //could be "onCall" for callable functions

//scheduler
export const mailboxScheduler = functions.region('europe-west6').pubsub.schedule('every 15 minutes').onRun(readMailbox);

// FIRESTORE DATABASE Listener
export const newsletterWelcomeEmail = functions.region('europe-west6').firestore.document('/newsletter/{id}').onCreate(sendNewsletterWelcomeMail);
export const feedbackThankyouEmail = functions.region('europe-west6').firestore.document('/feedback/{id}').onCreate(sendFeedbackThankYouMail);
