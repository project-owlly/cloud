import * as functions from 'firebase-functions';
import * as axios from 'axios';
import * as FormData from 'form-data';
import * as cors from 'cors';
import {configuration} from './../../config/oidc/schaffhausen';

export async function getEidData(request: functions.Request, response: functions.Response<any>) {
  const corsHandler = cors({
    origin: true,
  });

  corsHandler(request, response, async () => {
    try {
      const authCode = request.body.authorization_code;
      const redirect_uri = configuration.redirect_uri_prod;

      const form = new FormData();
      form.append('code', authCode);
      form.append('grant_type', 'authorization_code');
      form.append('redirect_uri', redirect_uri);

      let tokenData: any = await axios.default
        .post(configuration.token_endpoint, form, {
          headers: {
            Authorization: 'Basic ' + Buffer.from(functions.config().oidc.user + ':' + functions.config().oidc.pwd).toString('base64'),
            ...form.getHeaders(),
          },
        })
        .catch((error) => {
          response.json({
            error: error.message,
            fullerror: JSON.stringify(error),
          });
        });

      console.log('GET access token: ' + JSON.stringify(tokenData.data));

      let userData: any = await axios.default
        .get(configuration.userinfo_endpoint, {
          headers: {
            Authorization: 'Bearer ' + tokenData.data.access_token,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
        .catch((error) => {
          response.json({
            error: error.message,
            fullerror: JSON.stringify(error),
          });
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
