import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import * as cors from 'cors';

import {Owlly} from '../../types/owlly';
import {RequestError} from '../../types/request.error';

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

export function getOwlly(request: functions.Request, response: functions.Response<Owlly | RequestError>) {
  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      let owllyData: any = await db.collection('owlly').doc('vrrYZoolx2XSy23RW63f').get();

      console.log(
        JSON.stringify({
          ...owllyData.data(),
          ...{
            id: owllyData.id,
          },
        })
      );

      response.json({
        ...owllyData.data(),
        ...{
          id: owllyData.id,
        },
      });
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}
