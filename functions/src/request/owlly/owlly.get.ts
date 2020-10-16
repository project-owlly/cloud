import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import * as cors from 'cors';

import {Owlly} from '../../types/owlly';
import {RequestError} from '../../types/request.error';

import * as serviceAccount from '../../config/project-owlly-firebase-adminsdk-ntjiu-bacd1f6154.json';

const params = {
  type: serviceAccount.type,
  projectId: serviceAccount.project_id,
  privateKeyId: serviceAccount.private_key_id,
  privateKey: serviceAccount.private_key,
  clientEmail: serviceAccount.client_email,
  clientId: serviceAccount.client_id,
  authUri: serviceAccount.auth_uri,
  tokenUri: serviceAccount.token_uri,
  authProviderX509CertUrl: serviceAccount.auth_provider_x509_cert_url,
  clientC509CertUrl: serviceAccount.client_x509_cert_url,
};

admin.initializeApp({
  credential: admin.credential.cert(params),
  databaseURL: 'https://project-owlly.firebaseio.com',
});
const db = admin.firestore();

export function getOwlly(request: functions.Request, response: functions.Response<Owlly | RequestError>) {
  const corsHandler = cors({origin: true});

  corsHandler(request, response, async () => {
    try {
      let owllyData: any = await db.collection('owlly').doc('vrrYZoolx2XSy23RW63f').get();

      console.log(JSON.stringify(owllyData.data()));

      response.json({
        id: owllyData.id,
        title: owllyData.data().title,
        description: owllyData.data().text,
        link: owllyData.data().link,
        organisation: owllyData.data().organisation,
      });
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}
