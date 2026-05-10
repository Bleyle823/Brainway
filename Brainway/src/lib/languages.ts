export interface Language {
  code: string;
  name: string;
  nativeName: string;
  /** right-to-left script */
  rtl?: boolean;
  /** greeting used as Characters start-script when this language is active */
  greeting: string;
}

export const LANGUAGES: Language[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    greeting:
      "Hi — I'll stay alongside you calmly while your instructor teaches. Ask quietly any time.",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    greeting:
      "Hola — estaré aquí contigo con calma mientras tu instructor enseña. Pregunta cuando quieras.",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    greeting:
      "Bonjour — je resterai calmement à tes côtés pendant le cours. N'hésite pas à me poser des questions.",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    greeting:
      "Olá — ficarei ao seu lado com calma enquanto o professor ensina. Pergunte a qualquer momento.",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    greeting:
      "Hallo — ich begleite dich ruhig, während dein Kursleiter unterrichtet. Frag jederzeit.",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    rtl: true,
    greeting:
      "مرحباً — سأكون بجانبك بهدوء خلال الدرس. لا تتردد في السؤال في أي وقت.",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    greeting:
      "नमस्ते — मैं आपके शिक्षक के पढ़ाते समय शांति से आपके साथ रहूँगा। कभी भी पूछ सकते हैं।",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    greeting:
      "こんにちは。講師が授業を進める間、静かにそばでサポートします。いつでも気軽に質問してください。",
  },
  {
    code: "zh",
    name: "Mandarin Chinese",
    nativeName: "中文",
    greeting:
      "你好 — 在老师授课期间我会平静地陪伴你。随时可以提问。",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    greeting:
      "안녕하세요. 선생님이 수업하는 동안 조용히 함께하겠습니다. 언제든지 질문하세요.",
  },
  {
    code: "sw",
    name: "Swahili",
    nativeName: "Kiswahili",
    greeting:
      "Habari — nitakuwa nawe kwa utulivu wakati mwalimu anafundisha. Uliza wakati wowote.",
  },
];

export const DEFAULT_LANGUAGE_CODE = "en";

export function getLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
