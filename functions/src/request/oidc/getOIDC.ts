import * as functions from 'firebase-functions';

import {configuration} from './../../config/oidc/schaffhausen';

import * as cors from 'cors';

/*** ISSUER ***/
import {Issuer} from 'openid-client';

// import {generators} from 'openid-client';

interface OidAuth {
  url: string;
  token: string;
}

export async function getOIDAuthUrl(request: functions.Request, response: functions.Response<any>) {
  const corsHandler = cors({origin: true});

  corsHandler(request, response, async () => {
    try {
      const oidAuth = await generateOIDAuthUrl();

      response.json(oidAuth);
    } catch (err) {
      response.status(500).json({
        error: err,
      });
    }
  });
}

/******************************************************************/
//   E I D  /  O I D C  -  S T U F F
/******************************************************************/
export async function generateOIDAuthUrl(): Promise<OidAuth> {
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
    //state: token,
    redirect_uri: redirect_uri,
    scope: scope, //
  });

  //const token = crypto.randomBytes(64).toString('hex');
  const token = 'testtoken';

  //https://www.npmjs.com/package/openid-client
  //Authorization Code Flow
  //do it better https://stackoverflow.com/questions/33246028/save-token-in-local-storage-using-node

  return {
    url: authorizationUrl,
    token: token,
  };
}
