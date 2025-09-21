import { sanitizeSlug } from './slugUtils';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const getMetadata = (user) => user?.user_metadata || {};

export const getUserEmail = (user) => {
  const metadata = getMetadata(user);
  if (isNonEmptyString(metadata.email)) {
    return metadata.email.trim();
  }
  if (isNonEmptyString(user?.email)) {
    return user.email.trim();
  }
  return '';
};

export const getUserDisplayName = (user) => {
  const metadata = getMetadata(user);
  const candidates = [
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    metadata.preferred_name,
    metadata.persona_name,
    metadata.username,
    user?.name,
    getUserEmail(user)?.split('@')[0]
  ];

  for (const candidate of candidates) {
    if (isNonEmptyString(candidate)) {
      return candidate.trim();
    }
  }

  return 'User';
};

export const getUserUsername = (user) => {
  const metadata = getMetadata(user);
  const candidates = [
    metadata.username,
    metadata.handle,
    metadata.slug,
    metadata.profile_slug,
    metadata.custom_slug,
    metadata.customSlug,
    metadata.persona_handle
  ];

  for (const candidate of candidates) {
    if (isNonEmptyString(candidate)) {
      return candidate.trim();
    }
  }

  return '';
};

export const getUserInitials = (user, maxLength = 2) => {
  const metadata = getMetadata(user);

  const directInitials = metadata.avatar_initials || metadata.initials;
  if (isNonEmptyString(directInitials)) {
    return directInitials
      .trim()
      .replace(/\s+/g, '')
      .substring(0, Math.max(1, maxLength))
      .toUpperCase();
  }

  const displayName = getUserDisplayName(user);
  if (isNonEmptyString(displayName) && displayName !== 'User') {
    const words = displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    const initials = words
      .map((word) => word.charAt(0))
      .join('')
      .substring(0, Math.max(1, maxLength));

    if (initials) {
      return initials.toUpperCase();
    }
  }

  const email = getUserEmail(user);
  if (isNonEmptyString(email)) {
    return email.charAt(0).toUpperCase();
  }

  return 'U';
};

export const getUserProfileSlug = (user) => {
  const metadata = getMetadata(user);
  const email = getUserEmail(user);
  const candidates = [
    metadata.profile_slug,
    metadata.slug,
    metadata.custom_slug,
    metadata.customSlug,
    metadata.handle,
    metadata.username,
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    email ? email.split('@')[0] : '',
    user?.id
  ];

  for (const candidate of candidates) {
    const slug = sanitizeSlug(candidate);
    if (isNonEmptyString(slug)) {
      return slug;
    }
  }

  return '';
};

export const getUserProfileUrl = (user) => {
  const slug = getUserProfileSlug(user);
  if (!slug) {
    return '';
  }

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  if (origin) {
    return `${origin}/profile/${slug}`;
  }

  return `/profile/${slug}`;
};
