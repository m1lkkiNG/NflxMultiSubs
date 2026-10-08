const getDownloadables = track => track?.downloadables || track?.ttDownloadables || {};
const getTrackId = track => track?.id ?? track?.new_track_id;
const getTextTracks = manifest => Array.isArray(manifest.textTracks) ? manifest.textTracks :
  (Array.isArray(manifest.timedtexttracks) ? manifest.timedtexttracks : []);
function getUrls(downloadable) {
  const values = downloadable?.downloadUrls ? Object.values(downloadable.downloadUrls) : downloadable?.urls;
  return (Array.isArray(values) ? values : []).map(v => typeof v === 'string' ? v : v?.url)
    .filter(v => { try { return new URL(v).protocol === 'https:'; } catch { return false; } });
}
function ttmlTime(value, tickRate = 10000000) {
  if (typeof value !== 'string') return NaN;
  const clock = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(value);
  if (clock) return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
  const offset = /^(\d+(?:\.\d+)?)(h|m|s|ms|t)?$/.exec(value);
  if (!offset) return NaN;
  return Number(offset[1]) * ({ h: 3600, m: 60, s: 1, ms: 0.001, t: 1 / tickRate }[offset[2] || 't']);
}
async function downloadWithFallback(urls, extract, request = fetch, report = () => {}) {
  for (const url of urls || []) {
    let response;
    try {
      response = await request(url, {
        credentials: 'omit', signal: AbortSignal.timeout(15000),
      });
    } catch { report('SUBTITLE_REQUEST_FAILED'); continue; }
    if (!response.ok) { report('SUBTITLE_HTTP_FAILED', { status: response.status }); continue; }
    try {
      await extract(Promise.resolve(response));
      return;
    } catch { report('SUBTITLE_PARSE_FAILED'); }
  }
  throw new Error('SUBTITLE_DOWNLOAD_OR_PARSE_FAILED');
}
// Keep a real pixel gap, then use space above the primary row if the lower edge is tight.
function subtitleOffsets(primaryBottom, secondaryTop, secondaryBottom, videoBottom, gap, safe = 16) {
  const needed = Math.max(0, primaryBottom + gap - secondaryTop);
  const down = Math.min(needed, Math.max(0, videoBottom - safe - secondaryBottom));
  return { primary: down - needed, secondary: down };
}
module.exports = { getDownloadables, getTrackId, getTextTracks, getUrls, ttmlTime, downloadWithFallback, subtitleOffsets };
