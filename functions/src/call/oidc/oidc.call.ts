import * as functions from 'firebase-functions';
import {CallableContext} from 'firebase-functions/lib/providers/https';

import {configuration} from '../../config/oidc/schaffhausen';

/*** ISSUER ***/
import {Issuer} from 'openid-client';

interface OidcAuth {
  url: string;
  type: 'login' | 'wizard';
  owllyId?: string;
}

interface OidcAuthDataRequest {
  owllyId?: string;
}

interface OidcAuthLoginDataRequest {}

interface OidcState {
  type: 'login' | 'wizard';
  owllyId?: string;
}

export async function callOidcAuthUrlLogin(_data: OidcAuthLoginDataRequest, context: CallableContext): Promise<OidcAuth | undefined> {
  const scope: string = 'openid verified_simple';

  const oidAuth: Partial<OidcAuth> = await generateOidcAuthUrl(scope, {
    type: 'login',
  });

  return {
    ...oidAuth,
  } as OidcAuth;
}

export async function callOidcAuthUrl(data: OidcAuthDataRequest, context: CallableContext): Promise<OidcAuth | undefined> {
  const owllyId: string | undefined = data.owllyId;

  if (!owllyId) {
    return undefined;
  }

  const scope: string = 'openid given_name family_name birth_date street_address postal_code locality verified_simple';

  const oidAuth = await generateOidcAuthUrl(scope, {
    type: 'wizard',
    owllyId,
  });

  return {
    ...oidAuth,
    owllyId,
  } as OidcAuth;
}

/******************************************************************/
//   E I D  /  O I D C  -  S T U F F
/******************************************************************/
export async function generateOidcAuthUrl(scope: string, state: OidcState): Promise<Partial<OidcAuth>> {
  //change autodiscovery based on REQUEST.PARAM

  //autodiscovery, if system changes
  const eidIssuer = await Issuer.discover('https://eid.sh.ch');

  /*** CLIENT ***/
  const client = new eidIssuer.Client({
    client_id: functions.config().oidc.user,
    client_secret: functions.config().oidc.pwd,
    redirect_uris: [configuration.redirect_uri_app, configuration.redirect_uri_prod, configuration.redirect_uri_dev],
  }); // => Client /////, [keystore]

  const redirect_uri = configuration.redirect_uri_prod;

  const authorizationUrl = client.authorizationUrl({
    state: encodeURI(JSON.stringify(state)),
    redirect_uri: redirect_uri,
    scope: scope,
  });

  //const token = crypto.randomBytes(64).toString('hex');

  //https://www.npmjs.com/package/openid-client
  //Authorization Code Flow
  //do it better https://stackoverflow.com/questions/33246028/save-token-in-local-storage-using-node

  return {
    url: authorizationUrl,
    type: state.type,
  };
}