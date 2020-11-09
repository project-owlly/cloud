import * as functions from 'firebase-functions';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {configuration} from './../../config/oidc/schaffhausen';

import * as axios from 'axios';
import * as FormData from 'form-data';

import * as admin from 'firebase-admin';
admin.initializeApp(functions.config().firebase);

export async function callEidLogin(data: any, context: CallableContext): Promise<any | undefined> {
  const authCode = data.authorization_code;
  const redirect_uri = configuration.redirect_uri_prod;

  console.log(authCode);
  const form = new FormData();
  form.append('code', authCode);
  form.append('grant_type', 'authorization_code');
  form.append('redirect_uri', redirect_uri);

  let tokenData: any = await axios.default
    .post(configuration.token_endpoint, form, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(functions.config().oidc.user + ':' + functions.config().oidc.pwd).toString('base64'),
        ...form.getHeaders(),
      },
    })
    .catch((error) => {
      return {
        error: error.message,
        fullerror: JSON.stringify(error),
      };
    });

  let userData: any = await axios.default
    .get(configuration.userinfo_endpoint, {
      headers: {
        Authorization: 'Bearer ' + tokenData.data.access_token,
      },
    })
    .catch((error) => {
      return {
        error: error.message,
        fullerror: JSON.stringify(error),
      };
    });

  const userToken = await admin.auth().createCustomToken(userData.data.sub);
  return {
    userToken: userToken,
    idToken: tokenData.data.id_token,
  };
}
