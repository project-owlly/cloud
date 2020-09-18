import * as functions from 'firebase-functions';

import {configuration} from './../../config/oidc/schaffhausen';

/*** ISSUER ***/
const {Issuer} = require('openid-client');
const eidIssuer = new Issuer({
  issuer: configuration.issuer,
  authorization_endpoint: configuration.authorization_endpoint,
  token_endpoint: configuration.token_endpoint,
  userinfo_endpoint: configuration.userinfo_endpoint,
  jwks_uri: configuration.jwks_uri,
}); // => Issuer

/*** CLIENT ***/
const client = new eidIssuer.Client({
  client_id: functions.config().oidc.user,
  client_secret: functions.config().oidc.pwd,
}); // => Client /////, [keystore]

let scope = 'openid given_name family_name birth_date street_address postal_code locality verified_simple';

/******************************************************************/
//   E I D  /  O I D C  -  S T U F F
/******************************************************************/
export async function getOIDAuthUrl(request: functions.Request, response: functions.Response<any>): Promise<void> {
  const redirect_uri = configuration.redirect_uri_prod;

  let authorizationUrl = client.authorizationUrl({
    //state: token,
    redirect_uri: redirect_uri,
    scope: scope, //
    //scope: 'openid profile email phone addresponses verified_simple',
  });

  //const token = crypto.randomBytes(64).toString('hex');
  const token = 'testtoken';
  //do it better https://stackoverflow.com/questions/33246028/save-token-in-local-storage-using-node

  response.status(200);

  response.json({
    url: authorizationUrl,
    token: token,
  });
}
