import { createServerFn } from "@tanstack/react-start";
import { getRunwayApiSecret } from "./runway-config";

export const validateApiKeyFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const key = getRunwayApiSecret();
      return { 
        success: true, 
        hasKey: true,
        keyLength: key.length
      };
    } catch (error) {
      return { 
        success: false, 
        hasKey: false,
        error: error instanceof Error ? error.message : "Unknown API key error"
      };
    }
  });