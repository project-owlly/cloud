import * as functions from 'firebase-functions';
import {CallableContext} from 'firebase-functions/lib/providers/https';

import {configuration} from '../../config/oidc/schaffhausen';

import * as axios from 'axios';
import * as FormData from 'form-data';

interface EidLogin {
  id_token: string;
}

interface EidDataRequest {
  authorization_code: string;
}

export async function callEidLogin(data: EidDataRequest, context: CallableContext): Promise<string | undefined> {
  return await postEidLogin(data);
}

async function postEidLogin(data: EidDataRequest): Promise<string | undefined> {
  const form = new FormData();
  form.append('code', data.authorization_code);
  form.append('grant_type', 'authorization_code');
  form.append('redirect_uri', configuration.redirect_uri_prod);

  try {
    const tokenData: axios.AxiosResponse<EidLogin> = await axios.default.post<EidLogin>(configuration.token_endpoint, form, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(functions.config().oidc.user + ':' + functions.config().oidc.pwd).toString('base64'),
        ...form.getHeaders(),
      },
    });

    return tokenData.data.id_token;
  } catch (err) {
    console.error(err);
    return undefined;
  }
}
