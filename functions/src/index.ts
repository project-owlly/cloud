import * as functions from 'firebase-functions';
import 'firebase-functions/lib/logger/compat';

import {getOwlly} from './request/owlly/owlly.get';
import {postMailbox} from './request/mailbox/postMailbox';
import {postGeneratePdf} from './request/pdf/pdf.post';
import {getOIDAuthUrl} from './request/oidc/getOIDC';

export const owlly = functions.region('europe-west6').https.onRequest(getOwlly);

export const mailbox = functions.region('europe-west6').https.onRequest(postMailbox);

export const generatePDF = functions.region('europe-west6').https.onRequest(postGeneratePdf);

export const OIDAuthUrl = functions.region('europe-west6').https.onRequest(getOIDAuthUrl);
