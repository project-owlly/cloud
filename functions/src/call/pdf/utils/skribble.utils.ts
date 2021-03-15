import * as functions from 'firebase-functions';
var axios = require('axios');

export async function loginSkribble(): Promise<any> {
  var data = '{"username": "' + functions.config().skribble.username + '","api-key": "' + functions.config().skribble.apikey + '"}';

  var config = {
    method: 'post',
    url: 'https://api.skribble.com/v1/access/login',
    headers: {
      'Content-Type': 'application/json',
    },
    data: data,
  };
  try {
    let response = await axios(config);
    return response.data.toString();
  } catch (e) {
    console.error(e);
    return false;
  }

  /* .then(function (response: any) {
     console.log(JSON.stringify(response.data));

     return response.data.toString();
   })
   .catch(function (error: any) {
     console.log(error);
   });*/
}

export async function createSignatureRequest(fileUrl: string, token: string, title: string, email: string): Promise<any> {
  var data = JSON.stringify({
    title: 'E-Collecting mit owlly: ' + title,
    message: 'Bitte unterschreibe dieses Volksbegehren',
    //content: base64Document,
    file_url: fileUrl,
    quality: 'QES',
    legislation: 'ZERTES',
    write_access: ['sandro.scalco@liitu.ch'],
    signatures: [
      {
        signer_email_address: email,
        notify: false,
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

  try {
    let response = await axios(config);
    return response.data.signing_url;
  } catch (e) {
    console.log(e);
    return false;
  }

  /*
  {
    "id": "dddddddd-ab69-4b50-c174-ffffffffffffff",
    "title": "Example contract",
    "message": "Please sign this document!",
    "document_id": "99999999-0101-0202-7744-a829913fccf5",
    ...
}*/
}

export async function downloadSignedPdf(signatureRequest: any, token: string): Promise<any> {
  const documentId = await getDocumentIdFromSignaturegRequest(signatureRequest.id, token);
  console.log('skribble documentId from SignatureRequest: ' + documentId);

  var config = {
    method: 'get',
    url: 'https://api.skribble.com/v1/documents/' + signatureRequest.document_id + '/content',
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };
  try {
    const response = await axios(config);
    return response.data;
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function getDocumentIdFromSignaturegRequest(signatureRequestId: string, token: string) {
  var config = {
    method: 'get',
    url: 'https://api.skribble.com/v1/signature-requests/' + signatureRequestId,
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };

  try {
    let response = await axios(config);
    return response.data.document_id;
  } catch (e) {
    console.error(e);
    return false;
  }
}
