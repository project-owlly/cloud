import * as functions from 'firebase-functions';

import 'firebase-functions/lib/logger/compat';

import {getOwlly} from './request/owlly/owlly.get';

export const owlly = functions.https.onRequest(getOwlly);
