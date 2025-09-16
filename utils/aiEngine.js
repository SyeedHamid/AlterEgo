const fetch = require('node-fetch');
const SpellChecker = require('simple-spellchecker');

let dictionary = null;
SpellChecker.getDictionary("en-US", (err, dict) => {
  if (!err) dictionary = dict;
});

/**
 * Spell checks and corrects text.
 */
function spellCheckText(text) {
  if (!dictionary) return text;

  return text.split(' ').map(word => {
    const clean = word.replace(/[^a-zA-Z]/g, '');
    if (dictionary.spellCheck(clean)) return word;
    const suggestions = dictionary.getSuggestions(clean);
    return suggestions.length ? suggestions[0] : word;
  }).join(' ');
}

/**
 * Refines grammar and tone using Ollama.
 */
async function refineText(text, options = { tone: 'professional' }) {
  const prompt = `
Improve the grammar and clarity of the following text. Adjust the tone to be ${options.tone} and concise:

"${text}"
`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'mistral', prompt })
    });

    const data = await response.json();
    return spellCheckText(data.response);
  } catch (err) {
    console.warn('[WARN] Ollama not available for refinement.');
    return spellCheckText(text);
  }
}

/**
 * Generates a cover letter using Ollama or fallback template.
 */
async function generateCoverLetter(job, resumeText) {
  const prompt = `
Write a professional cover letter for the following job:\n${JSON.stringify(job)}\n\nBased on this resume:\n${resumeText}
`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'mistral', prompt })
    });

    const data = await response.json();
    return await refineText(data.response, { tone: 'confident' });
  } catch (err) {
    console.warn('[WARN] Ollama not available. Using fallback template.');
    const fallback = fillTemplate(job, resumeText);
    return await refineText(fallback, { tone: 'confident' });
  }
}

/**
 * Tailors resume using Ollama or returns original.
 */
async function tailorResume(job, resumeText) {
  const prompt = `
Rewrite the following resume to better match this job posting:

Job: ${JSON.stringify(job)}
Resume: ${resumeText}

Focus on aligning skills, keywords, and responsibilities. Keep it professional and concise.
`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'mistral', prompt })
    });

    const data = await response.json();
    return await refineText(data.response, { tone: 'professional' });
  } catch (err) {
    console.warn('[WARN] Ollama not available for resume tailoring.');
    return await refineText(resumeText, { tone: 'professional' });
  }
}

/**
 * Fallback template-based cover letter.
 */
function fillTemplate(job, resumeText) {
  const skills = extractSkills(resumeText);
  return `
Dear Hiring Manager at ${job.company},

I'm excited to apply for the ${job.title} role. With experience in ${skills.join(', ')}, I believe I’m a strong fit for your team.

Sincerely,
${process.env.APPLICANT_NAME || 'Your Name'}
  `;
}

/**
 * Extracts keywords from resume text.
 */
function extractSkills(text) {
  const keywords = ['JavaScript', 'Node.js', 'React', 'automation', 'GitHub', 'Playwright', 'API', 'cloud', 'CI/CD'];
  return keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
}

module.exports = {
  generateCoverLetter,
  tailorResume,
  refineText,
  spellCheckText
};
