const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateCoverLetter(job, resumePath) {
  const resumeText = fs.readFileSync(resumePath, 'utf-8');

  const prompt = `
You are a professional career assistant. Write a tailored cover letter for the following job using the resume content provided. The tone should be confident, concise, and aligned with the job description.

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}

Resume:
${resumeText}

Return the cover letter in plain text format.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  const coverLetterText = response.choices[0].message.content;

  // Save as PDF
  const filename = `${job.title.replace(/\s+/g, '_')}_cover_${Date.now()}.pdf`;
  const outputPath = path.join(__dirname, '../../data/resumes/', filename);
  const doc = new PDFDocument();

  doc.pipe(fs.createWriteStream(outputPath));
  doc.font('Times-Roman').fontSize(12).text(coverLetterText, { align: 'left' });
  doc.end();

  console.log(`📝 Cover letter saved as PDF: ${filename}`);
  return outputPath;
}

module.exports = generateCoverLetter;
