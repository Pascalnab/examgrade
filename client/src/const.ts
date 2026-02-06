export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Google OAuth login — the server handles the redirect to Google
export const getLoginUrl = () => {
  return `${window.location.origin}/api/oauth/google/login`;
};
