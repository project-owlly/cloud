import * as PDFDocument from 'pdfkit';
//import { switchToPage } from 'pdfkit';

import {format} from 'date-fns';

// TODO: Real data
const initiative = {
  titel: 'DAS IST DER MUSTERTITEL',
  datum: 'xx.xx.xxxx',
  initiativtext:
    'Cillum ut ea aliqua id laboris ad ullamco nisi enim magna. Id ad cupidatat laborum officia veniam cillum cillum aliqua tempor commodo sunt. Minim in officia labore magna officia et dolor in velit sunt ea nostrud consectetur.',
  urheber: 'Max Mustermann',
};

// TODO: Real data
const user = {
  vorname: 'Sandro',
  nachname: 'Scalco',
  birthday: '12. September 1848',
  adress: 'Stadtstrasse 1, 8200 Schaffhausen',
};

export async function generatePDFDoc(): Promise<PDFKit.PDFDocument> {
  const doc: PDFKit.PDFDocument = new PDFDocument({
    size: 'A4',
    // margins: {top: 20, left: 25, bottom: 20, right: 25},
    bufferPages: true,
  });
  doc.switchToPage(0);

  generatePDFHeader(doc);

  generatePDFKantonLogo(doc);

  generatePDFUnterzeichnerBlau(doc);

  generatePDFStempel(doc);

  generatePDFUserDaten(doc);

  generatePDFLines(doc);

  generatePDFLinesBeschriftungen(doc);

  generatePDFDownloadAufruf(doc);

  generatePDFLine(doc);

  generatePDFGraueRechteckeUnten(doc);

  generatePDFBeschriftungGraueRechtecke(doc);

  generatePDFInitiativtexte(doc);

  generatePDFFooter(doc);

  //doc.end()

  return doc;
}

function generatePDFHeader(doc: PDFKit.PDFDocument) {
  const grad: PDFKit.PDFLinearGradient = doc.linearGradient(0, 0, 612, 150);
  grad.stop(0, '#00a6d4').stop(1, '#81bc4f');
  doc.rect(0, 0, 612, 150);
  doc.fill(grad);

  doc.image(`${process.cwd()}/assets/images/owlly_top.png`, (doc.page.width - 277 * 0.22) / 2, -15, {scale: 0.22});

  doc.fillColor('white').font(`${process.cwd()}/assets/fonts/Lato-Thin.ttf`).fontSize(16).text('KANTONALE VOLKSINITIATIVE', 0, 39.5, {align: 'center'});

  doc.fillColor('white').font(`${process.cwd()}/assets/fonts/Lato-Black.ttf`).fontSize(30).text(initiative.titel, 0, 59.5, {align: 'center'});

  doc
    .fillColor('white')
    .font(`${process.cwd()}/assets/fonts/Lato-Thin.ttf`)
    .fontSize(10)
    .text('Veröffentlicht am' + ' ' + initiative.datum, 0, 95, {align: 'center'});
}

function generatePDFKantonLogo(doc: PDFKit.PDFDocument) {
  doc.lineCap('butt').lineWidth(7).moveTo(0, 150).lineTo(712, 150).stroke('#FEBF15');

  doc.image(`${process.cwd()}/assets/images/sh_wappen.png`, (doc.page.width - 162 / 4) / 2, 130, {scale: 0.25});
}

function generatePDFUnterzeichnerBlau(doc: PDFKit.PDFDocument) {
  doc.fillColor('#00a6d4').font(`${process.cwd()}/assets/fonts/Lato-Black.ttf`).fontSize(16).text('UNTERZEICHNER', 0, 210, {align: 'center'});
}

function generatePDFStempel(doc: PDFKit.PDFDocument) {
  doc.image(`${process.cwd()}/assets/images/stempel_grau.png`, 480, 160, {scale: 0.2});

  doc.rotate(-15);

  doc
    .fillColor('#929496')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(16)
    .text(format(new Date(), 'MM.dd.yyyy'), 416, 328, {align: 'left'});

  doc
    .fillColor('#929496')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(8)
    .text(format(new Date(), 'HH:mm') + ' Uhr', 438, 348, {align: 'left'});

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
  doc.fillColor('#888888').font(`${process.cwd()}/assets/fonts/Lato-Light.ttf`).fontSize(8).text('Vorname, Name', 0, 284, {align: 'center'});

  doc.fillColor('#888888').font(`${process.cwd()}/assets/fonts/Lato-Light.ttf`).fontSize(8).text('Geboren am', 140, 345, {align: 'left'});

  doc.fillColor('#888888').font(`${process.cwd()}/assets/fonts/Lato-Light.ttf`).fontSize(8).text('Adresse', 360, 345, {align: 'left'});
}

function generatePDFDownloadAufruf(doc: PDFKit.PDFDocument) {
  doc.image(`${process.cwd()}/assets/images/unterzeichnen.png`, (doc.page.width - 162 * 0.2) / 2, 400, {scale: 0.2});

  doc
    .fillColor('black')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(8)
    .text('Dokument digital signieren und retournieren an', 0, 450, {align: 'center'});

  doc.fillColor('#00a6d4').font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`).fontSize(8).text('briefkasten@owlly.ch', 0, 462, {align: 'center'});
}

function generatePDFLine(doc: PDFKit.PDFDocument) {
  doc.lineCap('butt').lineWidth(1).moveTo(0, 495).lineTo(doc.page.width, 495).dash(1, {}).stroke('#888888');
}

function generatePDFGraueRechteckeUnten(doc: PDFKit.PDFDocument) {
  doc.rect(35, 510, doc.page.width - 70, 30).fill('#f1f1f1');

  doc.rect(35, 545, doc.page.width - 70, doc.heightOfString(initiative.initiativtext) + 20).fill('#f1f1f1');

  doc.rect(35, 570 + doc.heightOfString(initiative.initiativtext), doc.page.width - 70, doc.heightOfString(initiative.urheber) + 20).fill('#f1f1f1');

  doc.rect(35, 725, doc.page.width - 70, 30).fill('#f1f1f1');
}

function generatePDFBeschriftungGraueRechtecke(doc: PDFKit.PDFDocument) {
  doc.fillColor('#a6a8aa').font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`).fontSize(8).text('Hinweis strafbar', 45, 515, {align: 'left'});

  doc
    .fillColor('#a6a8aa')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(8)
    .text('Wortlaut des Begehrens, Vollständiger Initiativtext', 45, 550, {align: 'left'});

  doc
    .fillColor('#a6a8aa')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(8)
    .text('Name und Adresse des Urhebers oder Urheber der Initiative (Initiativkomitee)', 45, 575 + doc.heightOfString(initiative.initiativtext), {
      align: 'left',
    });

  doc.fillColor('#a6a8aa').font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`).fontSize(8).text('Rückzugsklausel', 45, 730, {align: 'left'});
}

function generatePDFInitiativtexte(doc: PDFKit.PDFDocument) {
  doc
    .fillColor('#a6a8aa')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(8)
    .text('Du machst dich strafbar wenn dies und das', 45, 525, {align: 'left'});

  doc
    .fillColor('#a6a8aa')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(8)
    .text(initiative.initiativtext, 45, 560, {align: 'left', width: doc.page.width - 90});

  doc
    .fillColor('#a6a8aa')
    .font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`)
    .fontSize(8)
    .text(initiative.urheber, 45, 585 + doc.heightOfString(initiative.initiativtext), {align: 'left', width: doc.page.width - 90});

  doc.fillColor('#a6a8aa').font(`${process.cwd()}/assets/fonts/Lato-Regular.ttf`).fontSize(8).text('Das ist die Rückzugsklausel', 45, 740, {align: 'left'});
}

function generatePDFFooter(doc: PDFKit.PDFDocument) {
  const grad2: PDFKit.PDFLinearGradient = doc.linearGradient(0, 0, 612, 150);
  grad2.stop(0, '#81bc4f').stop(1, '#00a6d4');
  doc.rect(0, 765, doc.page.width, 50);
  doc.fill(grad2);

  doc
    .fillColor('white')
    .font(`${process.cwd()}/assets/fonts/Lato-Light.ttf`)
    .fontSize(9)
    .text('owlly.ch | enabling digital democracy', 0, 772, {align: 'center'});
}

function generatePDFUserDaten(doc: PDFKit.PDFDocument) {
  doc
    .fillColor('black')
    .font(`${process.cwd()}/assets/fonts/JustAnotherHand-Regular.ttf`)
    .fontSize(30)
    .text(user.vorname + ' ' + user.nachname, 0, 255, {align: 'center'});

  doc
    .fillColor('black')
    .font(`${process.cwd()}/assets/fonts/JustAnotherHand-Regular.ttf`)
    .fontSize(16)
    .text(user.birthday, (220 + doc.widthOfString(user.birthday)) / 2, 325, {align: 'left'});

  doc
    .fillColor('black')
    .font(`${process.cwd()}/assets/fonts/JustAnotherHand-Regular.ttf`)
    .fontSize(16)
    .text(user.adress, (doc.page.width - 200 + doc.widthOfString(user.adress)) / 2, 325, {align: 'left'});
}
