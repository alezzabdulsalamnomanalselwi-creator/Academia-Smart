export const isValidHttpUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export const isLikelyDocumentUrl = (value) => {
  if (!isValidHttpUrl(value)) return false;
  const url = new URL(value.trim());
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  const blockedHosts = ['chatgpt.com', 'www.chatgpt.com'];
  if (blockedHosts.includes(host)) return false;
  return /\.(pdf|doc|docx|jpg|jpeg|png)$/i.test(path) ||
    ['drive.google.com', 'docs.google.com', 'dropbox.com', 'onedrive.live.com'].some(domain => host === domain || host.endsWith(`.${domain}`));
};

export const isValidMeetingUrl = (value) => {
  if (!isValidHttpUrl(value)) return false;
  const host = new URL(value.trim()).hostname.toLowerCase();
  const allowed = ['zoom.us', 'meet.google.com', 'teams.microsoft.com', 'webex.com'];
  return allowed.some(domain => host === domain || host.endsWith(`.${domain}`));
};
