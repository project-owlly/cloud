import * as functions from 'firebase-functions';
import * as axios from 'axios';

import {configuration} from './../../config/oidc/schaffhausen';

import * as cors from 'cors';

export async function getEidData(request: functions.Request, response: functions.Response<any>) {
  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      let authCode = request.body.authorization_code;
      var redirect_uri = configuration.redirect_uri_prod;

      console.log('GET authorization_code: ' + authCode);

      let tokenData = await axios.default.post(
        configuration.token_endpoint,
        {
          code: authCode,
          grant_type: 'authorization_code',
          redirect_uri: redirect_uri,
        },
        {
          headers: {
            Authorization: 'Basic ' + Buffer.from(functions.config().oidc.user + ':' + functions.config().oidc.pwd).toString('base64'),
          },
        }
      );

      console.log('GET access token: ' + JSON.stringify(tokenData.data));

      let userData = await axios.default.get(configuration.userinfo_endpoint, {
        headers: {
          Authorization: 'Bearer ' + tokenData.data.access_token,
        },
      });

      console.log(JSON.stringify(userData.data));

      response.json({
        data: userData.data,
      });
    } catch (error) {
      response.json({
        error: error.message,
      });
    }
  });
}
