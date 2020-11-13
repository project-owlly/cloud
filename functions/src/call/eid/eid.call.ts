import * as functions from 'firebase-functions';
import {CallableContext} from 'firebase-functions/lib/providers/https';

import {configuration} from '../../config/oidc/schaffhausen';

import * as axios from 'axios';
import * as FormData from 'form-data';

interface EidUserData {}

interface EidLogin {
  id_token: string;
  access_token: string;
}

interface EidDataRequest {
  authorization_code: string;
}

export async function callEidLogin(data: EidDataRequest, context: CallableContext): Promise<string | undefined> {
  const eidToken: EidLogin | undefined = await postEidLogin(data);

  if (!eidToken) {
    return undefined;
  }

  return eidToken.id_token;
}

export async function callEidData(data: EidDataRequest, context: CallableContext): Promise<EidUserData | undefined> {
  const eidToken: EidLogin | undefined = await postEidLogin(data);

  if (!eidToken) {
    return undefined;
  }

  return await getEidUserData(eidToken.access_token);
}

async function postEidLogin(data: EidDataRequest): Promise<EidLogin | undefined> {
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

    return tokenData.data;
  } catch (err) {
    console.error(err);
    return undefined;
  }
}

async function getEidUserData(accessToken: string): Promise<EidUserData | undefined> {
  try {
    const userData: axios.AxiosResponse<EidUserData> = await axios.default.get(configuration.userinfo_endpoint, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    });

    return userData.data;
  } catch (err) {
    console.error(err);
    return undefined;
  }
}
