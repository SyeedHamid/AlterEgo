/**
 * Filters job listings based on keywords, location, and remote preference.
 * Extendable to include job type, salary, or company filters.
 * @param {Array} jobs - Array of job objects
 * @returns {Array} - Filtered job list
 */
function filterJobs(jobs) {
  const keywordFilter = process.env.JOB_KEYWORDS?.map(k => k.toLowerCase()) || [];
  const locationFilter = process.env.JOB_LOCATION?.toLowerCase() || '';
  const remoteOnly = process.env.REMOTE_ONLY === 'true';

  return jobs.filter(job => {
    const title = job.title?.toLowerCase() || '';
    const location = job.location?.toLowerCase() || '';
    const description = job.description?.toLowerCase() || '';

    const keywordMatch =
      keywordFilter.length === 0 ||
      keywordFilter.some(k => title.includes(k) || description.includes(k));

    const locationMatch = location.includes(locationFilter);
    const remoteMatch = !remoteOnly || location.includes('remote');

    return keywordMatch && locationMatch && remoteMatch;
  });
}

module.exports = { filterJobs };
