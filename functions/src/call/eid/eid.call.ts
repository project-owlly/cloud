import * as functions from 'firebase-functions';
import {CallableContext} from 'firebase-functions/lib/providers/https';

import {configurationSH} from '../../config/oidc/schaffhausen';
import {configurationZG} from '../../config/oidc/zug';

const config = {
  sh: configurationSH,
  zg: configurationZG,
};

import * as axios from 'axios';
import * as FormData from 'form-data';

interface EidUserData {}

interface EidLogin {
  id_token: string;
  access_token: string;
}

interface EidDataRequest {
  authorization_code: string;
  configuration: 'sh' | 'zg';
}

export async function callEidLogin(data: EidDataRequest, context: CallableContext): Promise<string | undefined> {
  const eidToken: EidLogin | undefined = await postEidToken(data);

  if (!eidToken) {
    return undefined;
  }

  return eidToken.id_token;
}

export async function callEidData(data: EidDataRequest, context: CallableContext): Promise<EidUserData | undefined> {
  //console.log(data);

  const eidToken: EidLogin | undefined = await postEidToken(data);

  if (!eidToken) {
    return undefined;
  }

  return await getEidUserData(eidToken.access_token, data.configuration);
}

async function postEidToken(data: EidDataRequest): Promise<EidLogin | undefined> {
  const form = new FormData();
  form.append('code', data.authorization_code);
  form.append('grant_type', 'authorization_code');
  form.append('redirect_uri', config[data.configuration].redirect_uri_prod);

  try {
    let basicString = '';
    switch (data.configuration) {
      case 'sh':
        basicString = Buffer.from(functions.config().oidc.user.sh + ':' + functions.config().oidc.pwd.sh).toString('base64');
        break;

      case 'zg':
        basicString = Buffer.from(functions.config().oidc.user.zg + ':' + functions.config().oidc.pwd.zg).toString('base64');
        break;
    }

    const tokenData: axios.AxiosResponse<EidLogin> = await axios.default.post<EidLogin>(config[data.configuration].token_endpoint, form, {
      headers: {
        Authorization: 'Basic ' + basicString,
        ...form.getHeaders(),
      },
    });

    return tokenData.data;
  } catch (err) {
    console.error(err);
    return undefined;
  }
}

async function getEidUserData(accessToken: string, configuration: 'sh' | 'zg'): Promise<EidUserData | undefined> {
  try {
    const userData: axios.AxiosResponse<EidUserData> = await axios.default.get(config[configuration].userinfo_endpoint, {
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
