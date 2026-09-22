const MAX_SLUG_LENGTH = 120;

const arabicTransliteration: Record<string, string> = {
  ا: "a", أ: "a", إ: "a", آ: "a", ب: "b", ت: "t", ث: "th",
  ج: "j", ح: "h", خ: "kh", د: "d", ذ: "th", ر: "r", ز: "z",
  س: "s", ش: "sh", ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a",
  غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n",
  ه: "h", ة: "h", و: "w", ؤ: "w", ي: "y", ى: "a", ئ: "y",
  ء: "",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

function trimHyphens(value: string) {
  return value.replace(/^-+|-+$/g, "");
}

export function createCourseSlugBase(title: string) {
  const normalized = title.normalize("NFKD").toLowerCase();
  let slug = "";

  for (const character of normalized) {
    if (/[a-z0-9]/.test(character)) {
      slug += character;
    } else if (character in arabicTransliteration) {
      slug += arabicTransliteration[character];
    } else if (!/[\u0300-\u036f\u064b-\u065f\u0670]/.test(character)) {
      slug += "-";
    }
  }

  const compact = trimHyphens(slug.replace(/-+/g, "-"));
  return trimHyphens(compact.slice(0, MAX_SLUG_LENGTH)) || "course";
}

export function createCourseSlugCandidate(base: string, attempt: number) {
  if (attempt === 0) return base;

  const suffix = `-${attempt + 1}`;
  const availableLength = MAX_SLUG_LENGTH - suffix.length;
  return `${trimHyphens(base.slice(0, availableLength))}${suffix}`;
}
