export const APP_MODE = process.env.APP_MODE || "single";
export const SINGLE_BARBER_SLUG =
  process.env.SINGLE_BARBER_SLUG || "luccifadez";
export const IS_SINGLE_MODE = APP_MODE === "single";
export const IS_MARKETPLACE_MODE = APP_MODE === "marketplace";

export const APP_NAME = IS_SINGLE_MODE ? "Luccifadez" : "LubooKing";
export const APP_DESCRIPTION = IS_SINGLE_MODE
  ? "Premium barber services by Luccifadez"
  : "Book your next haircut with top barbers";
