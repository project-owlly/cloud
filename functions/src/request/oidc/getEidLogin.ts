import * as functions from 'firebase-functions';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {configuration} from './../../config/oidc/schaffhausen';

import * as axios from 'axios';
import * as FormData from 'form-data';

export async function callEidLogin(data: any, context: CallableContext): Promise<any | undefined> {
  const form = new FormData();
  form.append('code', data.authorization_code);
  form.append('grant_type', 'authorization_code');
  form.append('redirect_uri', configuration.redirect_uri_prod);

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

  return {
    idToken: tokenData.data.id_token,
  };
}
