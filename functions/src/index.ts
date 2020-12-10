import * as functions from 'firebase-functions';
import 'firebase-functions/lib/logger/compat';

import {getOwlly} from './request/owlly/owlly.get';
import {callGeneratePdfUrl} from './call/pdf/pdf.call';

import {callOidcAuthUrl, callOidcAuthUrlLogin} from './call/oidc/oidc.call';

import {callEidData, callEidLogin} from './call/eid/eid.call';

import {readMailbox} from './scheduler/mailbox/mailbox.scheduler';

import {sendNewsletterWelcomeMail} from './firestore/newsletter/newsletter.create';
import {sendFeedbackThankYouMail} from './firestore/feedback/feedback.create';

// HTTP Requests (EXTERNAL) - Internal = from App should be onCall..
export const owlly = functions.region('europe-west6').https.onRequest(getOwlly);

// scheduler (Mailbox, Cleanup Documents)
export const mailboxScheduler = functions.region('europe-west6').pubsub.schedule('every 30 minutes').onRun(readMailbox);

// FIRESTORE DATABASE Listener
export const newsletterWelcomeEmail = functions.region('europe-west6').firestore.document('/newsletter/{id}').onCreate(sendNewsletterWelcomeMail);
export const feedbackThankyouEmail = functions.region('europe-west6').firestore.document('/feedback/{id}').onCreate(sendFeedbackThankYouMail);

// onCall +eid Data for PDF
export const OIDAuthUrl = functions.region('europe-west6').https.onCall(callOidcAuthUrl);
export const generatePDF = functions.region('europe-west6').https.onCall(callGeneratePdfUrl);

// onCall eID+ Login
export const OIDAuthUrlLogin = functions.region('europe-west6').https.onCall(callOidcAuthUrlLogin);
export const eidLogin = functions.region('europe-west6').https.onCall(callEidLogin);

// onCall eID+ user data
export const eidData = functions.region('europe-west6').https.onCall(callEidData);
