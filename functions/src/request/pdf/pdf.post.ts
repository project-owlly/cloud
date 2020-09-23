import * as functions from 'firebase-functions';

import * as cors from 'cors';

export function postGeneratePdf(request: functions.Request, response: functions.Response < any > ) {
  // TODO JONATHAN

  const corsHandler = cors({
    origin: true
  });

  corsHandler(request, response, () => {


    var user = {
      email: '',
      name: ''
    
    };
    
    user.email = request.body.adress;
    user.name = request.body.vorname;
    
    
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const doc = new PDFDocument();
    
    doc.pipe(fs.createWriteStream('file.pdf'));
    
    
    doc.text('Hello World! This is the first test for Owlly!', 100, 100);
    doc.text(user.email);
    doc.text(user.name);
    
    doc.end();
    
    
      response.json({result: 'successful'});



  });
}