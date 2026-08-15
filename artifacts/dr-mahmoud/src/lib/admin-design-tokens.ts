// Design tokens for Executive Admin Dashboard
export const ADMIN_DESIGN_TOKENS = {
  colors: {
    bgPage: "#0B1424",
    bgCard: "#131E31",
    bgCardHover: "#1A2942",
    border: "#26364D",
    borderLight: "#334766",
    primary: "#1677FF",
    primaryHover: "#4096FF",
    primaryBg: "rgba(22, 119, 255, 0.12)",
    textPrimary: "#F8FAFC",
    textSecondary: "#A8B5C7",
    textMuted: "#8492A6",
    success: "#52C41A",
    successBg: "rgba(82, 196, 26, 0.12)",
    warning: "#FA8C16",
    warningBg: "rgba(250, 140, 22, 0.12)",
    danger: "#FF4D4F",
    dangerBg: "rgba(255, 77, 79, 0.12)",
  },
  typography: {
    fontSans: "inherit",
    fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  radius: {
    card: "1rem",
    input: "0.75rem",
    button: "0.75rem",
    badge: "0.5rem",
  },
  shadows: {
    card: "0 4px 20px -2px rgba(0, 0, 0, 0.25)",
    dropdown: "0 10px 30px -5px rgba(0, 0, 0, 0.4)",
  },
} as const;

export const ADMIN_TOKENS = ADMIN_DESIGN_TOKENS;
