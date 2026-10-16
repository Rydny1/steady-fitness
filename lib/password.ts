import { z } from "zod";

/** The password rule. The same words show on the screen before anyone types. */
export const PASSWORD_HINT = "6+ characters, a number and a capital.";

export const PASSWORD_MIN = 6;
/** For the browser's own check. */
export const PASSWORD_PATTERN = "(?=.*\\d)(?=.*[A-Z]).{6,200}";

export const passwordRule = z
  .string()
  .min(PASSWORD_MIN)
  .max(200)
  .regex(/\d/)
  .regex(/[A-Z]/);
