import * as functions from 'firebase-functions';
import {CallableContext} from 'firebase-functions/lib/providers/https';

import {configurationSH} from '../../config/oidc/schaffhausen';
import {configurationZG} from '../../config/oidc/zug';

const config = {
  sh: configurationSH,
  zg: configurationZG,
};

/*** ISSUER ***/
import {Issuer} from 'openid-client';

interface OidcAuth {
  url: string;
  type: 'login' | 'wizard';
  owllyId?: string;
}

interface OidcAuthDataRequest {
  owllyId?: string;
  configuration: 'sh' | 'zg';
}

interface OidcAuthLoginDataRequest {}

interface OidcState {
  type: 'login' | 'wizard';
  owllyId?: string;
  configuration: 'sh' | 'zg';
}

export async function callOidcAuthUrlLogin(_data: OidcAuthLoginDataRequest, context: CallableContext): Promise<OidcAuth | undefined> {
  const scope: string = 'openid verified_simple';

  const oidAuth: Partial<OidcAuth> = await generateOidcAuthUrl(scope, {
    type: 'login',
    configuration: 'sh',
  });

  return {
    ...oidAuth,
  } as OidcAuth;
}

export async function callOidcAuthUrl(data: OidcAuthDataRequest, context: CallableContext): Promise<OidcAuth | undefined> {
  const owllyId: string | undefined = data.owllyId;
  const configuration = data.configuration;

  if (!owllyId) {
    return undefined;
  }

  const scope: string = 'openid given_name family_name birth_date street_address postal_code locality email verified_simple';

  const oidAuth = await generateOidcAuthUrl(scope, {
    type: 'wizard',
    owllyId,
    configuration,
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
  let eidIssuer;

  let client;

  switch (state.configuration) {
    case 'sh':
      eidIssuer = await Issuer.discover('https://eid.sh.ch');
      client = new eidIssuer.Client({
        client_id: functions.config().oidc.user.sh,
        client_secret: functions.config().oidc.pwd.sh,
        redirect_uris: [
          config[state.configuration].redirect_uri_app,
          config[state.configuration].redirect_uri_prod,
          config[state.configuration].redirect_uri_dev,
        ],
      }); // => Client /////, [keystore]

      break;
    case 'zg':
      eidIssuer = await Issuer.discover('https://gateway.ezug.ch');
      client = new eidIssuer.Client({
        client_id: functions.config().oidc.user.zg,
        client_secret: functions.config().oidc.pwd.zg,
        redirect_uris: [
          config[state.configuration].redirect_uri_app,
          config[state.configuration].redirect_uri_prod,
          config[state.configuration].redirect_uri_dev,
        ],
      }); // => Client /////, [keystore]
      break;
    default:
      eidIssuer = await Issuer.discover('https://eid.sh.ch');
      client = new eidIssuer.Client({
        client_id: functions.config().oidc.user.sh,
        client_secret: functions.config().oidc.pwd.sh,
        redirect_uris: [config.sh.redirect_uri_app, config.sh.redirect_uri_prod, config.sh.redirect_uri_dev],
      }); // => Client /////, [keystore]
      break;
  }

  /*const client = new eidIssuer.Client({
    client_id: functions.config().oidc.user.sh,
    client_secret: functions.config().oidc.pwd.sh,
    redirect_uris: [config[state.configuration].redirect_uri_app, config[state.configuration].redirect_uri_prod, config[state.configuration].redirect_uri_dev],
  }); // => Client /////, [keystore]
  */

  const redirect_uri = config[state.configuration].redirect_uri_prod;
  //const redirect_uri = configuration.redirect_uri_dev;

  //console.log('state' + JSON.stringify(state));
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
