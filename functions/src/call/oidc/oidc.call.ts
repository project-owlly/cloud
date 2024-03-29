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

interface OidcAuthLoginDataRequest {
  configuration: 'sh' | 'zg';
}

interface OidcState {
  type: 'login' | 'wizard';
  owllyId?: string;
  configuration: 'sh' | 'zg';
}

export async function callOidcAuthUrlLogin(data: OidcAuthLoginDataRequest, context: CallableContext): Promise<OidcAuth | undefined> {
  const scope: string = 'openid zug:login_id given_name family_name email verified_simple';

  const oidAuth: Partial<OidcAuth> = await generateOidcAuthUrl(scope, {
    type: 'login',
    configuration: data.configuration,
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

  const scope: string = 'openid zug:login_id given_name family_name birth_date street_address postal_code locality email verified_simple';

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

  //console.log('generateOidcAuthUrl');
  //console.log('configuration: ' + state.configuration);
  /*console.log(
    'redirect urls: ' +
      [config[state.configuration].redirect_uri_app, config[state.configuration].redirect_uri_prod, config[state.configuration].redirect_uri_dev].toString()
  );*/

  const eidIssuer = await Issuer.discover(config[state.configuration].issuer);
  const client = new eidIssuer.Client({
    client_id: functions.config().oidc.user[state.configuration],
    client_secret: functions.config().oidc.pwd[state.configuration],
    redirect_uris: [
      //config[state.configuration].redirect_uri_app,
      config[state.configuration].redirect_uri_prod,
      //config[state.configuration].redirect_uri_dev,
    ],
  }); // => Client /////, [keystore]

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
