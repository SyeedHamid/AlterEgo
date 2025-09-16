const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function writePDF(content, filename, folder = 'data/output') {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const doc = new PDFDocument();
  const filePath = path.join(folder, filename);
  doc.pipe(fs.createWriteStream(filePath));

  doc.font('Times-Roman').fontSize(12).text(content, {
    align: 'left',
    lineGap: 6
  });

  doc.end();
  return filePath;
}

module.exports = { writePDF };
