import * as functions from 'firebase-functions';
import * as cors from 'cors';

import {RequestError} from '../../types/request.error';

//const db = admin.firestore();

export function callbackSuccess(request: functions.Request, response: functions.Response<any | RequestError>) {
  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      const token = request.param('token');
      const document_id = request.param('document_id');
      const signature_request = request.param('signature_request');

      console.log(token + ' - ' + document_id + ' - ' + signature_request);

      console.log('SUCCESS CALLBACK SKRIBBLE');
      response.end();
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}
export function callbackUpdate(request: functions.Request, response: functions.Response<any | RequestError>) {
  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      console.log('UPDATE CALLBACK SKRIBBLE');
      response.end();
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}

export function callbackError(request: functions.Request, response: functions.Response<any | RequestError>) {
  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      console.log('ERROR CALLBACK SKRIBBLE');
      response.end();
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}
