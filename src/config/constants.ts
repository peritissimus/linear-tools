// src/config/constants.ts
export const API_CONFIG = {
  LINEAR_BASE_URL: "https://api.linear.app",
  OPENAI_BASE_URL: "https://api.openai.com/v1",
  DEFAULT_MODEL: "gpt-4o",
};

export const CLI_CONFIG = {
  DEFAULT_OUTPUT_FORMAT: "text",
  SUPPORTED_OUTPUT_FORMATS: ["text", "json"] as const,
};
