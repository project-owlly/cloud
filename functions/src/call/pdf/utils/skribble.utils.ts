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
}

export async function deleteDocument(documentId: string, token: string) {
  var config = {
    method: 'delete',
    url: 'https://api.skribble.com/v1/documents/' + documentId,
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };

  try {
    let response = await axios(config);
    return response.data;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function deleteSignatureRequest(signatureRequestId: string, token: string) {
  var config = {
    method: 'delete',
    url: 'https://api.skribble.com/v1/signature-requests/' + signatureRequestId,
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };

  try {
    let response = await axios(config);
    return response.data;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function createSignatureRequest(
  fileUrl: string,
  token: string,
  title: string,
  email: string,
  tempFileId: string,
  firstName: string
): Promise<any> {
  var data = JSON.stringify({
    title: 'E-Collecting mit owlly: ' + title,
    message: `Hallo ${firstName}! Bitte unterschreibe dieses Volksbegehren mit Skribble. Anschliessend wirst du automatisch wieder auf owlly.ch weitergeleitet. Falls etwas nicht funktioniert, erhälst du von uns eine Erinnerungsemail. Wenn alles geklappt hat, dann bestätigen wir dir den Empfang der Unterschrift per E-Mail. Liebe Grüsse dein owlly-Team.`,
    //content: base64Document,
    file_url: fileUrl,
    quality: 'QES',
    legislation: 'ZERTES',
    //write_access: ['sandro.scalco@liitu.ch'],

    callback_success_url:
      'https://europe-west6-project-owlly.cloudfunctions.net/skribbleCallbackSuccess?signature_request=SKRIBBLE_SIGNATURE_REQUEST_ID&document_id=SKRIBBLE_DOCUMENT_ID&token=' +
      tempFileId,
    callback_update_url:
      'https://europe-west6-project-owlly.cloudfunctions.net/skribbleCallbackUpdate?signature_request=SKRIBBLE_SIGNATURE_REQUEST_ID&document_id=SKRIBBLE_DOCUMENT_ID&token=' +
      tempFileId,
    callback_error_url:
      'https://europe-west6-project-owlly.cloudfunctions.net/skribbleCallbackError?signature_request=SKRIBBLE_SIGNATURE_REQUEST_ID&document_id=SKRIBBLE_DOCUMENT_ID&token=' +
      tempFileId,

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
    return response.data;
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

export async function downloadSignedPdf(documentId: string, token: string): Promise<string | boolean> {
  let config = {
    method: 'get',
    url: 'https://api.skribble.com/v1/documents/' + documentId + '/content',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
    },
    //responseType: 'arraybuffer',
  };
  try {
    const response = await axios(config);

    return response.data.content;
    //console.log("typ: " + response.data.content_type + "grösse: " + response.data.content_size );
    //return response.data.content;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function getSignatureRequest(signatureRequestId: string, token: string): Promise<any> {
  var config = {
    method: 'get',
    url: 'https://api.skribble.com/v1/signature-requests/' + signatureRequestId,
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };

  try {
    let response = await axios(config);
    return response.data;
  } catch (e) {
    console.error(e);
    return false;
  }
}
/*
function sleep(ms:any) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  */
