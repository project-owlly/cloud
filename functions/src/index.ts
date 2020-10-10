import * as functions from 'firebase-functions';
import 'firebase-functions/lib/logger/compat';

import * as cors from 'cors';

import * as express from 'express';

import {getOwlly} from './request/owlly/owlly.get';
import {postMailbox} from './request/mailbox/postMailbox';
import {getGeneratePdf} from './request/pdf/pdf.post';
import {getOIDAuthUrl} from './request/oidc/getOIDC';
import {getEidData} from './request/oidc/getEidData';

const appGeneratePdf = express();
appGeneratePdf.use(cors({origin: true}));
appGeneratePdf.get('/:owllyId', getGeneratePdf);

export const owlly = functions.region('europe-west6').https.onRequest(getOwlly);

export const mailbox = functions.region('europe-west6').https.onRequest(postMailbox);

export const generatePDF = functions.region('europe-west6').https.onRequest(appGeneratePdf);

export const OIDAuthUrl = functions.region('europe-west6').https.onRequest(getOIDAuthUrl);

export const eidData = functions.region('europe-west6').https.onRequest(getEidData);
