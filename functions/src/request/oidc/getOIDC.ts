import * as functions from 'firebase-functions';
import {CallableContext} from 'firebase-functions/lib/providers/https';

import {configuration} from './../../config/oidc/schaffhausen';

/*** ISSUER ***/
import {Issuer} from 'openid-client';

interface OidAuth {
  url: string;
  state: string | undefined;
}

interface OidAuthDataRequest {
  state: string; // currently owllyId
}

export async function callOIDAuthUrl(data: OidAuthDataRequest, context: CallableContext): Promise<OidAuth | undefined> {
  const state: string | undefined = data.state;

  if (!state) {
    return undefined;
  }

  const oidAuth = await generateOIDAuthUrl(state);

  return oidAuth;
}

/******************************************************************/
//   E I D  /  O I D C  -  S T U F F
/******************************************************************/
export async function generateOIDAuthUrl(state: string | undefined): Promise<OidAuth> {
  //change autodiscovery based on REQUEST.PARAM

  //autodiscovery, if system changes
  const eidIssuer = await Issuer.discover('https://eid.sh.ch');

  /*** CLIENT ***/
  const client = new eidIssuer.Client({
    client_id: functions.config().oidc.user,
    client_secret: functions.config().oidc.pwd,
    redirect_uris: [configuration.redirect_uri_app, configuration.redirect_uri_prod, configuration.redirect_uri_dev],
  }); // => Client /////, [keystore]

  const scope = 'openid given_name family_name birth_date street_address postal_code locality verified_simple';

  const redirect_uri = configuration.redirect_uri_prod;

  const authorizationUrl = client.authorizationUrl({
    state: state,
    redirect_uri: redirect_uri,
    scope: scope,
  });

  //const token = crypto.randomBytes(64).toString('hex');

  //https://www.npmjs.com/package/openid-client
  //Authorization Code Flow
  //do it better https://stackoverflow.com/questions/33246028/save-token-in-local-storage-using-node

  return {
    url: authorizationUrl,
    state: state,
  };
}
