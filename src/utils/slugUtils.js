export const sanitizeSlug = (value) => {
  if (!value && value !== 0) {
    return '';
  }

  return value
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const buildProfileSlug = ({ personaSettings = {}, profile = null, fallbackName = '', fallbackId = '' } = {}) => {
  const candidates = [
    personaSettings.slug,
    personaSettings.custom_slug,
    personaSettings.customSlug,
    personaSettings.handle,
    personaSettings.username,
    personaSettings.display_name,
    personaSettings.displayName,
    personaSettings.name,
    profile?.username,
    profile?.handle,
    fallbackName,
    profile?.full_name,
    fallbackId
  ];

  for (const candidate of candidates) {
    const slug = sanitizeSlug(candidate);
    if (slug) {
      return slug;
    }
  }

  return 'aura-assistant';
};

export const isPermissionError = (error) => {
  if (!error) {
    return false;
  }

  const message = (error.message || '').toLowerCase();
  const details = (error.details || '').toLowerCase();

  return (
    error.code === 'PGRST301' ||
    error.code === '42501' ||
    message.includes('permission') ||
    message.includes('not authorized') ||
    message.includes('anonymous') ||
    details.includes('permission') ||
    details.includes('not authorized')
  );
};
