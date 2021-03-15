import * as functions from 'firebase-functions';
var axios = require('axios');

export async function loginSkribble(): Promise<any> {
  var data = '{\r\n    "username": "' + functions.config().skribble.username + '",\r\n    "api-key": "' + functions.config().skribble.apikey + '",\r\n}';

  var config = {
    method: 'post',
    url: 'https://api.skribble.com/v1/access/login',
    headers: {
      'Content-Type': 'application/json',
    },
    data: data,
  };

  axios(config)
    .then(function (response: any) {
      console.log(JSON.stringify(response.data));

      return response.data;
    })
    .catch(function (error: any) {
      console.log(error);
    });
}

export async function createSignatureRequest(base64Document: string, token: string): Promise<any> {
  var data = JSON.stringify({
    title: 'Example contract',
    message: 'Please sign this document!',
    content: '{{base64Document}}',
    signatures: [
      {
        signer_email_address: 'hi@owlly.ch',
      },
    ],
  });

  var config = {
    method: 'post',
    url: 'https://api.skribble.com/v1/signature-requests',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    data: data,
  };

  axios(config)
    .then(function (response: any) {
      console.log(JSON.stringify(response.data));

      /*
  {
    "id": "dddddddd-ab69-4b50-c174-ffffffffffffff",
    "title": "Example contract",
    "message": "Please sign this document!",
    "document_id": "99999999-0101-0202-7744-a829913fccf5",
    ...
}*/

      return response.data;
    })
    .catch(function (error: any) {
      console.log(error);
      return false;
    });
}

export async function downloadSignedPdf(signatureRequest: string, token: string): Promise<any> {
  const documentId = getDocumentIdFromSignaturegRequest(signatureRequest);

  var config = {
    method: 'get',
    url: 'https://api.skribble.com/v1/documents/' + documentId + '/content',
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };

  axios(config)
    .then(function (response: any) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error: any) {
      console.log(error);
    });
}

function getDocumentIdFromSignaturegRequest(signatureRequest: string) {
  var config = {
    method: 'get',
    url: 'https://api.skribble.com/v1/signature-requests/' + signatureRequest,
    headers: {},
  };

  axios(config)
    .then(function (response: any) {
      console.log(JSON.stringify(response.data));
      return response.data.document_id;

      /*
{
  "id": "cccccccc-4a6a-a958-a42e-6ea4172a378b",
  "title": "Example contract",
  "message": "Please sign this document!",
  "document_id": "d98ae06a-3ae4-5cc5-c0a3-62b05901b84f",
  ...
}
*/
    })
    .catch(function (error: any) {
      console.log(error);
    });

  return 'documentId';
}
