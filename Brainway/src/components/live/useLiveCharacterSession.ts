import { useCallback, useEffect, useState } from "react";
import type { SessionCredentials } from "@runwayml/avatars-react";
import type { ProfileId } from "@/components/transform/ProfileSelector";
import type { AllConfig } from "@/components/transform/TransformConfig";
import { DEFAULT_LANGUAGE_CODE } from "@/lib/languages";
import { createCharacterSessionFn } from "@/lib/character-fns";

export type LiveCharacterStage = "setup" | "connecting" | "session" | "ended";

export function useLiveCharacterSession() {
  const [stage, setStage] = useState<LiveCharacterStage>("setup");
  const [selectedProfiles, setSelectedProfiles] = useState<Set<ProfileId>>(new Set());
  const [config, setConfig] = useState<AllConfig>({} as AllConfig);
  const [credentials, setCredentials] = useState<SessionCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientReady, setClientReady] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_LANGUAGE_CODE);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const toggleProfile = useCallback((id: ProfileId) => {
    setSelectedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const updateConfig = useCallback(
    (profileId: ProfileId, key: string, value: number | boolean | string) => {
      setConfig((prev) => ({
        ...prev,
        [profileId]: { ...(prev[profileId] ?? {}), [key]: value },
      }));
    },
    [],
  );

  const resetAll = useCallback(() => {
    setStage("setup");
    setSelectedProfiles(new Set());
    setConfig({} as AllConfig);
    setCredentials(null);
    setError(null);
    setTargetLanguage(DEFAULT_LANGUAGE_CODE);
  }, []);

  const handleStartSession = useCallback(async () => {
    if (selectedProfiles.size === 0) return;
    setError(null);
    setStage("connecting");
    try {
      const creds = await createCharacterSessionFn({
        data: {
          profiles: Array.from(selectedProfiles),
          config,
          targetLanguage,
        },
      });
      setCredentials(creds);
      setStage("session");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session.");
      setStage("setup");
    }
  }, [selectedProfiles, config, targetLanguage]);

  const canStart = selectedProfiles.size > 0;

  return {
    stage,
    setStage,
    selectedProfiles,
    setSelectedProfiles,
    toggleProfile,
    config,
    updateConfig,
    credentials,
    setCredentials,
    error,
    setError,
    clientReady,
    targetLanguage,
    setTargetLanguage,
    resetAll,
    handleStartSession,
    canStart,
  };
}
