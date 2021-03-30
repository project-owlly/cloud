import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';

import {configurationSH} from '../../config/oidc/schaffhausen';
import {configurationZG} from '../../config/oidc/zug';

const config = {
  sh: configurationSH,
  zg: configurationZG,
};

//var axios = require('axios');
import * as axios from 'axios';
import * as FormData from 'form-data';

import jwt_decode from 'jwt-decode';
//import {auth} from 'firebase-admin';

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
  //console.log('callEidLogin');
  //console.log('data from request: ' + JSON.stringify(data));

  const eidToken: EidLogin | undefined = await postEidToken(data);

  if (!eidToken) {
    return undefined;
  }

  console.log('Login Token' + JSON.stringify(eidToken));
  const decoded: any = jwt_decode(eidToken.id_token);
  const customtoken = await admin.auth().createCustomToken(decoded.sub);

  return customtoken;
  //return eidToken.id_token;
}

export async function callEidData(data: EidDataRequest, context: CallableContext): Promise<EidUserData | undefined> {
  //console.log('callEidData');
  //console.log('1. data from request authorization_code: ' + JSON.stringify(data.authorization_code));
  //console.log('1. data from request configuration: ' + JSON.stringify(data.configuration));

  //console.log('2. get access token with auth_code: ' + JSON.stringify(data.authorization_code));
  const eidToken: EidLogin | undefined = await postEidToken(data);

  if (!eidToken) {
    return undefined;
  }

  //console.log('3. GET UserData with Access Token: ' + eidToken.access_token);
  return await getEidUserData(eidToken.access_token, data.configuration);
}

async function postEidToken(data: EidDataRequest): Promise<EidLogin | undefined> {
  var form = new FormData();
  form.append('code', data.authorization_code);
  form.append('grant_type', 'authorization_code');
  form.append('redirect_uri', config[data.configuration].redirect_uri_prod);

  let axiosConfig: any = {
    method: 'post',
    url: config[data.configuration].token_endpoint,
    headers: {
      Authorization:
        'Basic ' + Buffer.from(functions.config().oidc.user[data.configuration] + ':' + functions.config().oidc.pwd[data.configuration]).toString('base64'),
      ...form.getHeaders(),
    },
    data: form,
  };

  try {
    const response: any = await axios.default(axiosConfig);
    return response.data;
  } catch (e) {
    console.log('Token error');
    console.error(e);
    return undefined;
  }
}

async function getEidUserData(accessToken: string, configuration: 'sh' | 'zg'): Promise<EidUserData | undefined> {
  var axiosConfig: any = {
    method: 'get',
    url: config[configuration].userinfo_endpoint,
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  };

  try {
    const response = await axios.default(axiosConfig);
    let object: any = {};
    object = response.data;
    object.configuration = configuration;
    return object;
  } catch (err) {
    console.log('userinfo_endpoint error');
    console.error(err);
    return undefined;
  }
}
