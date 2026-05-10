import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CaretDown } from "@phosphor-icons/react";
import { type ProfileId, PROFILES } from "./ProfileSelector";

type FieldType = "slider" | "toggle" | "select";

interface ConfigField {
  label: string;
  type: FieldType;
  key: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
  description?: string;
  default: number | boolean | string;
}

const CONFIGS: Record<ProfileId, ConfigField[]> = {
  adhd: [
    {
      label: "Segment length",
      type: "slider",
      key: "segmentLength",
      min: 30,
      max: 120,
      step: 15,
      unit: "s",
      default: 75,
      description: "Maximum duration per learning segment before a checkpoint appears",
    },
    {
      label: "Checkpoints per segment",
      type: "slider",
      key: "checkpoints",
      min: 1,
      max: 4,
      step: 1,
      unit: "",
      default: 2,
    },
    {
      label: "Focus-mode dimming",
      type: "toggle",
      key: "focusMode",
      default: true,
      description: "Dims peripheral elements to keep attention on the presenter",
    },
    {
      label: "Visible progress bar",
      type: "toggle",
      key: "progressBar",
      default: true,
    },
  ],
  autism: [
    {
      label: "Scene-change cue volume",
      type: "slider",
      key: "cueVolume",
      min: 0,
      max: 100,
      step: 10,
      unit: "%",
      default: 40,
      description: "Volume of the audio tone that signals every scene transition",
    },
    {
      label: "Presenter gesture set",
      type: "select",
      key: "gestureSet",
      options: ["Scripted minimal", "Scripted moderate", "Frozen (no gestures)"],
      default: "Scripted minimal",
    },
    {
      label: "Background motion",
      type: "select",
      key: "backgroundMotion",
      options: ["Static", "Very subtle loop", "None"],
      default: "Static",
    },
    {
      label: "Signal scene changes",
      type: "toggle",
      key: "sceneSignal",
      default: true,
    },
  ],
  dyslexia: [
    {
      label: "Max words per frame",
      type: "slider",
      key: "wordsPerFrame",
      min: 3,
      max: 10,
      step: 1,
      unit: " words",
      default: 6,
    },
    {
      label: "Text size multiplier",
      type: "slider",
      key: "textScale",
      min: 1.0,
      max: 2.0,
      step: 0.25,
      unit: "×",
      default: 1.5,
    },
    {
      label: "Apply OpenDyslexic font",
      type: "toggle",
      key: "dyslexicFont",
      default: true,
      description: "Replaces all on-screen text with the OpenDyslexic typeface",
    },
    {
      label: "Visual-first ordering",
      type: "toggle",
      key: "visualFirst",
      default: true,
      description: "Shows the concept illustration before confirming text appears",
    },
    {
      label: "Narrate all on-screen text",
      type: "toggle",
      key: "narrateText",
      default: true,
    },
  ],
  sensory: [
    {
      label: "Colour saturation",
      type: "slider",
      key: "saturation",
      min: 0,
      max: 100,
      step: 5,
      unit: "%",
      default: 35,
      description: "0% is fully greyscale; lower values reduce visual intensity",
    },
    {
      label: "Max audio peak",
      type: "slider",
      key: "audioPeak",
      min: -24,
      max: -6,
      step: 1,
      unit: " dB",
      default: -14,
    },
    {
      label: "Background ambience cap",
      type: "slider",
      key: "ambienceCap",
      min: 0,
      max: 30,
      step: 5,
      unit: "%",
      default: 15,
    },
    {
      label: "Transition style",
      type: "select",
      key: "transition",
      options: ["Dissolve only", "Fade to black", "Cross-fade"],
      default: "Dissolve only",
    },
    {
      label: "Remove lyrics from music",
      type: "toggle",
      key: "noLyrics",
      default: true,
    },
  ],
};

export type ConfigValues = Record<string, number | boolean | string>;
export type AllConfig = Record<ProfileId, ConfigValues>;

interface Props {
  selectedProfiles: Set<ProfileId>;
  config: AllConfig;
  onChange: (profileId: ProfileId, key: string, value: number | boolean | string) => void;
}

export default function TransformConfig({ selectedProfiles, config, onChange }: Props) {
  const [expanded, setExpanded] = useState<ProfileId | null>(null);

  const profiles = PROFILES.filter((p) => selectedProfiles.has(p.id));

  if (profiles.length === 0) return null;

  return (
    <div className="space-y-2">
      {profiles.map((profile) => {
        const fields = CONFIGS[profile.id];
        const profileConfig = config[profile.id] ?? {};
        const isOpen = expanded === profile.id;

        return (
          <div
            key={profile.id}
            className="rounded-[1.25rem] bg-white/65 border border-neutral-300/60 overflow-hidden"
          >
            <button
              onClick={() => setExpanded(isOpen ? null : profile.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <profile.icon
                  className="w-4 h-4 shrink-0"
                  weight="fill"
                  style={{ color: profile.accentColor }}
                />
                <span className="text-sm text-neutral-950">
                  {profile.label} — settings
                </span>
              </div>
              <CaretDown
                weight="fill"
                className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-6 pt-2 grid sm:grid-cols-2 gap-x-8 gap-y-6 border-t border-neutral-200/90">
                    {fields.map((field) => {
                      const raw = profileConfig[field.key];
                      const value = raw !== undefined ? raw : field.default;

                      return (
                        <div key={field.key}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-neutral-700">
                              {field.label}
                            </label>
                            {field.type === "slider" && (
                              <span className="text-xs font-normal text-neutral-950">
                                {value as number}
                                {field.unit}
                              </span>
                            )}
                          </div>

                          {field.description && (
                            <p className="text-xs text-neutral-500 mb-2 leading-snug">
                              {field.description}
                            </p>
                          )}

                          {field.type === "slider" && (
                            <input
                              type="range"
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              value={value as number}
                              onChange={(e) =>
                                onChange(profile.id, field.key, parseFloat(e.target.value))
                              }
                              className="w-full h-1.5 rounded-full appearance-none bg-neutral-300/80 cursor-pointer accent-neutral-900"
                            />
                          )}

                          {field.type === "toggle" && (
                            <button
                              role="switch"
                              aria-checked={value as boolean}
                              onClick={() =>
                                onChange(profile.id, field.key, !(value as boolean))
                              }
                              className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
                                value ? "bg-neutral-900" : "bg-neutral-300/80"
                              }`}
                            >
                              <span
                                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                  value ? "translate-x-5" : "translate-x-1"
                                }`}
                              />
                            </button>
                          )}

                          {field.type === "select" && (
                            <select
                              value={value as string}
                              onChange={(e) =>
                                onChange(profile.id, field.key, e.target.value)
                              }
                              className="w-full text-xs text-neutral-950 bg-white/70 border border-neutral-300/70 rounded-lg px-3 py-1.5 outline-none cursor-pointer"
                            >
                              {field.options?.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
