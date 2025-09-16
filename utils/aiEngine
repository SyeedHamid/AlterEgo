const fetch = require('node-fetch');
const SpellChecker = require('simple-spellchecker');

let dictionary = null;
SpellChecker.getDictionary("en-US", (err, dict) => {
  if (!err) dictionary = dict;
});

/**
 * Attempts to generate a cover letter using Ollama.
 * Falls back to template if Ollama is unavailable.
 */
async function generateCoverLetter(job, resumeText) {
  const prompt = `Write a professional cover letter for this job:\n${JSON.stringify(job)}\nBased on this resume:\n${resumeText}`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'mistral', prompt })
    });

    const data = await response.json();
    const cleaned = spellCheckText(data.response);
    return cleaned;
  } catch (err) {
    console.warn('[WARN] Ollama not available. Using fallback template.');
    return spellCheckText(fillTemplate(job, resumeText));
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
${process.env.APPLICANT_NAME}
  `;
}

/**
 * Extracts keywords from resume text.
 */
function extractSkills(text) {
  const keywords = ['JavaScript', 'Node.js', 'React', 'automation', 'GitHub', 'Playwright'];
  return keywords.filter(k => text.includes(k));
}

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

module.exports = { generateCoverLetter };
