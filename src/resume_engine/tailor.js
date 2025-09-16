const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth'); // For .docx
const pdfParse = require('pdf-parse'); // For .pdf
const PDFDocument = require('pdfkit');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const resumePath = process.env.RESUME_PATH || path.join(__dirname, '../../data/resumes/base_resume.txt');

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt' || ext === '.md') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  throw new Error(`Unsupported resume format: ${ext}`);
}

async function tailorResume(job) {
  const baseResumeText = await extractText(resumePath);

  const prompt = `
You are a resume optimization assistant. Given the following job description and base resume, rewrite the resume to better match the job while keeping it truthful and professional.

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}

Base Resume:
${baseResumeText}

Return the tailored resume in plain text format.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  const tailoredText = response.choices[0].message.content;

  // Convert to PDF
  const filename = `${job.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const outputPath = path.join(__dirname, '../../data/resumes/', filename);
  const doc = new PDFDocument();

  doc.pipe(fs.createWriteStream(outputPath));
  doc.font('Times-Roman').fontSize(12).text(tailoredText, { align: 'left' });
  doc.end();

  console.log(`📄 Tailored resume saved as PDF: ${filename}`);
  return outputPath;
}

module.exports = tailorResume;
