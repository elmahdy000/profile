/**
 * Centralized Design Token System for Dr. Mahmoud Admin Dashboard
 */

export const ADMIN_TOKENS = {
  // Brand & Primary
  primary: "#0B63CE",
  primaryHover: "#0956B4",
  primaryLight: "#EAF3FF",

  // Status & Feedback
  success: "#16A36A",
  successLight: "#E9F8F1",
  successBorder: "#B7E7D0",

  danger: "#E5484D",
  dangerLight: "#FFF0F1",
  dangerBorder: "#FECDD3",

  warning: "#D97706",

  // Text & Content
  textPrimary: "#14213D",
  textSecondary: "#667085",

  // Icons
  defaultIcon: "#718096",
  mutedIcon: "#98A2B3",

  // Borders & Surfaces
  border: "#E2E8F0",
  softSurface: "#F8FAFC",

  // Badges & Contextual Tokens
  badgePublished: {
    bg: "#E9F8F1",
    text: "#16A36A",
    border: "#B7E7D0",
  },
  badgePlaylist: {
    bg: "#EAF3FF",
    text: "#0B63CE",
    border: "#B8D7FF",
  },
  badgeOnline: {
    bg: "#EEF6FF",
    text: "#175CD3",
    border: "#B2DDFF",
  },
  badgeUndefined: {
    bg: "#F2F4F7",
    text: "#667085",
    border: "#DDE2E8",
  },
} as const;
