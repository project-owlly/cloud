import * as PDFDocument from 'pdfkit';
import {format} from 'date-fns';
var QRCode = require('qrcode');

const {formatToTimeZone} = require('date-fns-timezone');

export async function generatePDFDoc(data: any): Promise<PDFKit.PDFDocument> {
  const doc: PDFKit.PDFDocument = new PDFDocument({
    size: 'A4',
    margins: {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    },
    bufferPages: true,
  });
  doc.switchToPage(0);

  generatePDFHeader(doc, data);

  generatePDFKantonLogo(doc, data);

  generatePDFUnterzeichnerBlau(doc);

  generatePDFStempel(doc);

  generatePDFUserDaten(doc, data);

  generatePDFLines(doc); //"formular"

  generatePDFLinesBeschriftungen(doc);

  generatePDFDownloadAufruf(doc);

  generatePDFFileId(doc, data);

  await generatePDFQRCode(doc, data);

  generatePDFLine(doc);

  generatePDFGraueRechteckeUnten(doc, data);

  generatePDFBeschriftungGraueRechtecke(doc, data);

  generatePDFInitiativtexte(doc, data);

  generatePDFFooter(doc);

  return doc;
}

export async function generateBescheinigung(data: any): Promise<PDFKit.PDFDocument> {
  const doc: PDFKit.PDFDocument = new PDFDocument({
    size: 'A4',
    margins: {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    },
    bufferPages: true,
  });
  doc.switchToPage(0);

  generatePDFHeader(doc, data);

  generatePDFKantonLogo(doc, data);

  generatePDFStempel(doc);

  generateAmountValidSignatures(doc, data);

  generateHashList(doc, data);

  generateAmtsstelle(doc);

  generateSkribbleFeld(doc);

  generatePDFFooter(doc);

  return doc;
}

function generateAmountValidSignatures(doc: PDFKit.PDFDocument, data: any) {
  //Sig Beschriftung
  doc.fillColor('#888888').font('fonts/Lato-Light.ttf').fontSize(8).text('Anzahl gültiger Unterschriften', 35, 193);
  //Sig Rechteck
  doc.rect(35, 206, 105, 30).fill('#f1f1f1');
  //Sig Zahl
  doc.fillColor('#000000').font('fonts/Lato-Black.ttf').fontSize(22).text(data.length, 40, 207);
}

function generateHashList(doc: PDFKit.PDFDocument, data: any) {
  //Titel
  doc.fillColor('#000000').font('fonts/Lato-Black.ttf').fontSize(18).text('Unterschriften IDs', 35, 290);
  //zweikolumnige Liste
  var xAxis = 35;
  var yAxis = 320;
  var rightColumn = false;
  for (var i = 0; i < data.length; i++) {
    if (320 + i * 20 > 600 && rightColumn == false) {
      xAxis = 306;
      yAxis = 320;
      rightColumn = true;
    }
    doc.fontSize(10).font('fonts/Lato-Light.ttf').text(data[i], xAxis, yAxis);
    yAxis += 20;
  }
}

function generateAmtsstelle(doc: PDFKit.PDFDocument) {
  doc.fillColor('#888888').font('fonts/Lato-Light.ttf').fontSize(8).text('Bescheinigende Amtsstelle', 35, 742);

  doc.lineCap('butt').lineWidth(1).moveTo(35, 740).lineTo(262, 740).dash(1, {}).stroke('#888888');
}

function generateSkribbleFeld(doc: PDFKit.PDFDocument) {
  doc.rect(350, 680, 227, 60).fill('#f1f1f1');
  doc.fillColor('#888888').font('fonts/Lato-Light.ttf').fontSize(8).text('Digitale Signatur', 350, 668);
}

function generatePDFHeader(doc: PDFKit.PDFDocument, data: any) {
  const grad: PDFKit.PDFLinearGradient = doc.linearGradient(0, 0, 612, 150);
  grad.stop(0, '#00a6d4').stop(1, '#81bc4f');
  doc.rect(0, 0, 612, 150);
  doc.fill(grad);

  doc.image(`${process.cwd()}/assets/images/owlly_top.png`, (doc.page.width - 277 * 0.22) / 2, -15, {
    scale: 0.22,
  });

  if (data.owllyData.type === 'initiative') {
    if (data.owllyData.level === 'canton') {
      doc.fillColor('white').font(`${process.cwd()}/assets/fonts/Lato-Thin.ttf`).fontSize(16).text('KANTONALE VOLKSINITIATIVE', 0, 39.5, {
        align: 'center',
      });
    } else {
      doc.fillColor('white').font(`${process.cwd()}/assets/fonts/Lato-Thin.ttf`).fontSize(16).text('EIDGENÖSSISCHE VOLKSINITIATIVE', 0, 39.5, {
        align: 'center',
      });
    }
  } else if (data.owllyData.type === 'referendum') {
    if (data.owllyData.level === 'canton') {
      doc.fillColor('white').font(`${process.cwd()}/assets/fonts/Lato-Thin.ttf`).fontSize(16).text('REFERENDUM', 0, 39.5, {
        align: 'center',
      });
    } else {
      doc.fillColor('white').font(`${process.cwd()}/assets/fonts/Lato-Thin.ttf`).fontSize(16).text('REFERENDUM', 0, 39.5, {
        align: 'center',
      });
    }
  }

  doc.fillColor('white').font(`${process.cwd()}/assets/fonts/Lato-Black.ttf`).fontSize(30).text(data.owllyData.title, 0, 59.5, {
    align: 'center',
  });

  //console.log(data.owllyData.published);

  if (data.owllyData.type === 'referendum') {
    doc
      .fillColor('white')
      .font(`${process.cwd()}/assets/fonts/Lato-Thin.ttf`)
      .fontSize(10)
      .text('Beginn der Referendumsfrist am ' + ' ' + format(new Date(data.owllyData.published._seconds * 1000), 'dd.MM.yyyy'), 0, 95, {
        align: 'center',
      });
  } else if (data.owllyData.type === 'initiative') {
    doc
      .fillColor('white')
      .font(`${process.cwd()}/assets/fonts/Lato-Thin.ttf`)
      .fontSize(10)
      .text('Veröffentlicht am ' + ' ' + format(new Date(data.owllyData.published._seconds * 1000), 'dd.MM.yyyy'), 0, 95, {
        align: 'center',
      });
  }
}

function generatePDFKantonLogo(doc: PDFKit.PDFDocument, data: any) {
  doc.lineCap('butt').lineWidth(7).moveTo(0, 150).lineTo(712, 150).stroke('#FEBF15');

  if (data.owllyData.level === 'canton') {
    doc.image(`${process.cwd()}/assets/flags/` + String(data.owllyData.ruleValue).toUpperCase() + `.png`, (doc.page.width - 162 / 4) / 2, 130, {
      scale: 0.25,
    });
  } else {
    //national
    doc.image(`${process.cwd()}/assets/flags/CH.png`, (doc.page.width - 162 / 4) / 2, 130, {
      scale: 0.25,
    });
  }
}

function generatePDFUnterzeichnerBlau(doc: PDFKit.PDFDocument) {
  doc.fillColor('#00a6d4').font(`${process.cwd()}/assets/fonts/Lato-Black.ttf`).fontSize(16).text('UNTERZEICHNER', 0, 210, {
    align: 'center',
  });
}

function generatePDFStempel(doc: PDFKit.PDFDocument) {
  doc.image(`${process.cwd()}/assets/images/stempel_grau.png`, 480, 160, {
    scale: 0.2,
  });

  doc.rotate(-15);

  doc.fillColor('#929496').font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`).fontSize(16).text(format(new Date(), 'dd.MM.yyyy'), 416, 328, {
    align: 'left',
  });

  doc
    .fillColor('#929496')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(6)
    .text(formatToTimeZone(new Date(), 'HH:mm', {timeZone: 'Europe/Berlin'}) + ' Uhr', 438, 348, {
      align: 'left',
    });

  doc.rotate(15);
}

function generatePDFLines(doc: PDFKit.PDFDocument) {
  doc
    .lineCap('butt')
    .lineWidth(1)
    .moveTo(100, 280)
    .lineTo(doc.page.width - 100, 280)
    .dash(1, {})
    .stroke('#888888');

  doc.lineCap('butt').lineWidth(1).moveTo(100, 340).lineTo(220, 340).dash(1, {}).stroke('#888888');

  doc
    .lineCap('butt')
    .lineWidth(1)
    .moveTo(230, 340)
    .lineTo(doc.page.width - 100, 340)
    .dash(1, {})
    .stroke('#888888');
}

function generatePDFLinesBeschriftungen(doc: PDFKit.PDFDocument) {
  doc.fillColor('#888888').font(`${process.cwd()}/assets/fonts/Lato-Light.ttf`).fontSize(6).text('Vorname, Name', 0, 284, {
    align: 'center',
  });

  doc.fillColor('#888888').font(`${process.cwd()}/assets/fonts/Lato-Light.ttf`).fontSize(6).text('Geburtsdatum', 140, 345, {
    align: 'left',
  });

  doc.fillColor('#888888').font(`${process.cwd()}/assets/fonts/Lato-Light.ttf`).fontSize(6).text('Adresse', 360, 345, {
    align: 'left',
  });
}

function generatePDFDownloadAufruf(doc: PDFKit.PDFDocument) {
  doc.image(`${process.cwd()}/assets/images/unterzeichnen.png`, (doc.page.width - 162 * 0.2) / 2, 380, {
    //400
    scale: 0.2,
  });

  doc.fillColor('black').font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`).fontSize(6).text('Dokument digital signieren und retournieren an', 0, 430, {
    align: 'center',
  });

  doc.fillColor('#00a6d4').font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`).fontSize(6).text('briefkasten@owlly.ch', 0, 442, {
    align: 'center',
  });
}

function generatePDFFileId(doc: PDFKit.PDFDocument, data: any) {
  doc
    .fillColor('black')
    .font(`${process.cwd()}/assets/fonts/Lato-Light.ttf`)
    .fontSize(6)
    .text('Identifikation für die Stimmrechtsbescheinigung: ' + data.fileId, 0, 454, {
      align: 'center',
    })
    .text('Verifizierungscode: ' + data.verifyHash, 0, 460, {
      align: 'center',
    });
}

async function generatePDFQRCode(doc: PDFKit.PDFDocument, data: any) {
  const url = await QRCode.toDataURL('https://owlly.ch/verify/' + data.fileId);
  doc.image(url, 35, 420, {width: 50});
}

function generatePDFLine(doc: PDFKit.PDFDocument) {
  doc.lineCap('butt').lineWidth(1).moveTo(0, 475).lineTo(doc.page.width, 475).dash(1, {}).stroke('#888888');
}

function generatePDFGraueRechteckeUnten(doc: PDFKit.PDFDocument, data: any) {
  doc.rect(35, 490, doc.page.width - 70, 25).fill('#f1f1f1'); //Hinweis Strafbar

  doc.rect(35, 520, doc.page.width - 70, doc.heightOfString(data.owllyData.text) + 40).fill('#f1f1f1'); //Wortlaut des Begehrens

  doc.rect(35, 555 + doc.heightOfString(data.owllyData.text) + 10, doc.page.width - 70, doc.heightOfString(data.owllyData.author) + 30).fill('#f1f1f1'); //Urheber = author

  doc.rect(35, 745, doc.page.width - 70, 35).fill('#f1f1f1'); //Rückzugsklausel looks good
}

function generatePDFBeschriftungGraueRechtecke(doc: PDFKit.PDFDocument, data: any) {
  doc
    .fillColor('#a6a8aa')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(6)
    .text(
      'Wer bei einer Unterschriftensammlung besticht oder sich bestechen lässt oder wer das Ergebnis einer Unterschriftensammlung fälscht, macht sich strafbar nach Art. 281 beziehungsweise nach Art. 282 des Strafgesetzbuches.',
      45,
      495,
      {
        align: 'left',
        width: doc.page.width - 90,
      }
    );

  doc.fillColor('#a6a8aa').font(`${process.cwd()}/assets/fonts/Lato-Black.ttf`).fontSize(6).text('Wortlaut des Begehrens', 45, 525, {
    align: 'left',
  });

  doc
    .fillColor('#a6a8aa')
    .font(`${process.cwd()}/assets/fonts/Lato-Black.ttf`)
    .fontSize(6)
    .text('Urheber', 45, 555 + doc.heightOfString(data.owllyData.text), {
      align: 'left',
    });

  doc.fillColor('#a6a8aa').font(`${process.cwd()}/assets/fonts/Lato-Black.ttf`).fontSize(6).text('Rückzugsklausel', 45, 750, {
    align: 'left',
  });
}

function generatePDFInitiativtexte(doc: PDFKit.PDFDocument, data: any) {
  doc
    .fillColor('#a6a8aa')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(6)
    .text(data.owllyData.text, 45, 540, {
      align: 'left',
      width: doc.page.width - 90,
    });

  doc
    .fillColor('#a6a8aa')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(6)
    .text(data.owllyData.author, 45, 575 + doc.heightOfString(data.owllyData.text), {
      align: 'left',
      width: doc.page.width - 90,
    });

  //if Initiative
  if (data.owllyData.type === 'initiative') {
    //Rückzugsklausel looks ok
    doc
      .fillColor('#a6a8aa')
      .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
      .fontSize(6)
      .text(
        'Das Initiativkomitee, bestehend aus den genannten Urheberinnen und Urhebern, ist berechtigt, diese Volksinitiative mit absoluter Mehrheit seiner noch stimmberechtigten Mitglieder zurückzuziehen.',
        45,
        760,
        {
          align: 'left',
          width: doc.page.width - 90,
        }
      );
  }
}

//Footer looks good
function generatePDFFooter(doc: PDFKit.PDFDocument) {
  const grad2: PDFKit.PDFLinearGradient = doc.linearGradient(0, 0, 592, 150);
  grad2.stop(0, '#81bc4f').stop(1, '#00a6d4');
  doc.rect(0, 792, doc.page.width, 50);
  doc.fill(grad2);

  doc.fillColor('white').font(`${process.cwd()}/assets/fonts/Lato-Light.ttf`).fontSize(9).text('owlly.ch | enabling digital democracy', 0, 812, {
    align: 'center',
  });
}

function generatePDFUserDaten(doc: PDFKit.PDFDocument, data: any) {
  doc
    .fillColor('black')
    .font(`${process.cwd()}/assets/fonts/JustAnotherHand-Regular.ttf`)
    .fontSize(30)
    .text(data.userData.given_name + ', ' + data.userData.family_name, 0, 255, {
      align: 'center',
    });

  doc
    .fillColor('black')
    .font(`${process.cwd()}/assets/fonts/JustAnotherHand-Regular.ttf`)
    .fontSize(16)
    .text(data.userData.birth_date, (220 + doc.widthOfString(data.userData.birth_date)) / 2, 325, {
      align: 'left',
    });

  doc
    .fillColor('black')
    .font(`${process.cwd()}/assets/fonts/JustAnotherHand-Regular.ttf`)
    .fontSize(16)
    .text(
      data.userData.street_address + ', ' + data.userData.postal_code + ' ' + data.userData.locality,
      (doc.page.width - 200 + doc.widthOfString(data.userData.street_address + ', ' + data.userData.postal_code + ' ' + data.userData.locality)) / 2,
      325,
      {
        align: 'left',
      }
    );
}
