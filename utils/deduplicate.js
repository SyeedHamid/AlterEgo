/**
 * Removes duplicate job listings based on title, company, and location.
 * This ensures JobPilot doesn't reapply or reprocess identical listings.
 * @param {Array} jobs - Array of job objects
 * @returns {Array} - Deduplicated job list
 */
function deduplicateJobs(jobs) {
  const seen = new Set();

  return jobs.filter(job => {
    // Normalize key for comparison
    const key = `${job.title?.trim().toLowerCase()}|${job.company?.trim().toLowerCase()}|${job.location?.trim().toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

module.exports = { deduplicateJobs };
