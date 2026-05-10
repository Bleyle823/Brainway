/**
 * Languages supported by Runway `eleven_voice_dubbing` (`targetLang`).
 * @see @runwayml/sdk VoiceDubbingCreateParams
 */
export type RunwayVoiceDubbingLang =
  | "en"
  | "hi"
  | "pt"
  | "zh"
  | "es"
  | "fr"
  | "de"
  | "ja"
  | "ar"
  | "ru"
  | "ko"
  | "id"
  | "it"
  | "nl"
  | "tr"
  | "pl"
  | "sv"
  | "fil"
  | "ms"
  | "ro"
  | "uk"
  | "el"
  | "cs"
  | "da"
  | "fi"
  | "bg"
  | "hr"
  | "sk"
  | "ta";

export interface DubbingLanguageOption {
  code: RunwayVoiceDubbingLang;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

const DUB_LANG_SET = new Set<string>([
  "en",
  "hi",
  "pt",
  "zh",
  "es",
  "fr",
  "de",
  "ja",
  "ar",
  "ru",
  "ko",
  "id",
  "it",
  "nl",
  "tr",
  "pl",
  "sv",
  "fil",
  "ms",
  "ro",
  "uk",
  "el",
  "cs",
  "da",
  "fi",
  "bg",
  "hr",
  "sk",
  "ta",
]);

/** All ElevenLabs / Runway voice-dubbing targets for the Localize lecture flow. */
export const VOICE_DUBBING_LANGUAGES: DubbingLanguageOption[] = [
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
  { code: "bg", name: "Bulgarian", nativeName: "Български" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" },
  { code: "fil", name: "Filipino", nativeName: "Filipino" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
];

export function isRunwayVoiceDubbingLang(code: string): code is RunwayVoiceDubbingLang {
  return DUB_LANG_SET.has(code);
}

export function getVoiceDubbingLanguage(
  code: string,
): DubbingLanguageOption | undefined {
  return VOICE_DUBBING_LANGUAGES.find((l) => l.code === code);
}
