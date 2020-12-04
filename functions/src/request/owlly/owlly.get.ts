import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import DocumentData = admin.firestore.DocumentData;
import QueryDocumentSnapshot = admin.firestore.QueryDocumentSnapshot;

import * as cors from 'cors';

import {Owlly} from '../../types/owlly';
import {RequestError} from '../../types/request.error';

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

export function getOwlly(request: functions.Request, response: functions.Response<Owlly[] | RequestError>) {
  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      const snapshot = await db.collection('owlly').get();

      if (snapshot.empty) {
        response.json([]);
        return;
      }

      const results: Owlly[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        return {
          id: doc.id,
          data: doc.data(),
        } as Owlly;
      });

      response.json(results);
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}
