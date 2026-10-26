export const MOBILE_BREAKPOINT = 768;

export const STATUS_MAP = {
  PREPARE_FOR_SUBMISSION: { label: "Prepare for Submission", color: "#ff9500", bg: "rgba(255,149,0,0.12)" },
  WAITING_FOR_REVIEW: { label: "Waiting for Review", color: "#ff9500", bg: "rgba(255,149,0,0.12)" },
  IN_REVIEW: { label: "In Review", color: "#af52de", bg: "rgba(175,82,222,0.12)" },
  READY_FOR_DISTRIBUTION: { label: "Ready for Distribution", color: "#34c759", bg: "rgba(52,199,89,0.12)" },
  READY_FOR_SALE: { label: "Ready for Sale", color: "#34c759", bg: "rgba(52,199,89,0.12)" },
  DEVELOPER_REJECTED: { label: "Developer Rejected", color: "#ff3b30", bg: "rgba(255,59,48,0.12)" },
  REJECTED: { label: "Rejected", color: "#ff3b30", bg: "rgba(255,59,48,0.12)" },
  PENDING_DEVELOPER_RELEASE: { label: "Pending Developer Release", color: "#007aff", bg: "rgba(0,122,255,0.12)" },
  REMOVED_FROM_SALE: { label: "Removed", color: "#8e8e93", bg: "rgba(142,142,147,0.12)" },
};

export const TERMINAL_STATES = new Set([
  "READY_FOR_SALE",
  "REMOVED_FROM_SALE",
  "DEVELOPER_REJECTED",
  "REJECTED",
]);

export const RELEASED_STATES = new Set([
  "READY_FOR_SALE",
  "REMOVED_FROM_SALE",
]);

export const SUBMITTABLE_STATES = new Set([
  "PREPARE_FOR_SUBMISSION",
  "REJECTED",
  "DEVELOPER_REJECTED",
]);

export const RELEASABLE_STATES = new Set(["PENDING_DEVELOPER_RELEASE"]);

export const RELEASE_TYPES = [
  { value: "MANUAL", label: "Manually release this version" },
  { value: "AFTER_APPROVAL", label: "Automatically release this version" },
  { value: "SCHEDULED", label: "Automatically release this version after App Review, no earlier than" },
];

export const PHASED_RELEASE_DAY_PERCENTAGES = {
  1: "1%", 2: "2%", 3: "5%", 4: "10%", 5: "20%", 6: "50%", 7: "100%",
};

export const ACCT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a78bfa", "#ef4444", "#ec4899", "#14b8a6"];

export const IAP_STATUS_MAP = {
  MISSING_METADATA: { label: "Missing Metadata", color: "#ff9500", bg: "rgba(255,149,0,0.12)" },
  READY_TO_SUBMIT: { label: "Ready to Submit", color: "#007aff", bg: "rgba(0,122,255,0.12)" },
  ADDED_TO_REVIEW: { label: "Added to Review", color: "#5856d6", bg: "rgba(88,86,214,0.12)" },
  WAITING_FOR_REVIEW: { label: "Waiting for Review", color: "#ff9500", bg: "rgba(255,149,0,0.12)" },
  IN_REVIEW: { label: "In Review", color: "#af52de", bg: "rgba(175,82,222,0.12)" },
  APPROVED: { label: "Approved", color: "#34c759", bg: "rgba(52,199,89,0.12)" },
  DEVELOPER_ACTION_NEEDED: { label: "Action Needed", color: "#ff3b30", bg: "rgba(255,59,48,0.12)" },
  REJECTED: { label: "Rejected", color: "#ff3b30", bg: "rgba(255,59,48,0.12)" },
  REMOVED_FROM_SALE: { label: "Removed", color: "#8e8e93", bg: "rgba(142,142,147,0.12)" },
};

export const IAP_TYPES = [
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "NON_CONSUMABLE", label: "Non-Consumable" },
  { value: "NON_RENEWING_SUBSCRIPTION", label: "Non-Renewing Subscription" },
];

export const CI_COMPLETION_STATUS_MAP = {
  SUCCEEDED: { label: "Succeeded", color: "#34c759", bg: "rgba(52,199,89,0.12)" },
  FAILED: { label: "Failed", color: "#ff3b30", bg: "rgba(255,59,48,0.12)" },
  ERRORED: { label: "Errored", color: "#ff3b30", bg: "rgba(255,59,48,0.12)" },
  CANCELED: { label: "Canceled", color: "#8e8e93", bg: "rgba(142,142,147,0.12)" },
  SKIPPED: { label: "Skipped", color: "#8e8e93", bg: "rgba(142,142,147,0.12)" },
};

export const CI_PROGRESS_STATUS_MAP = {
  PENDING: { label: "Pending", color: "#ff9500", bg: "rgba(255,149,0,0.12)" },
  RUNNING: { label: "Running", color: "#007aff", bg: "rgba(0,122,255,0.12)" },
  COMPLETE: { label: "Complete", color: "#34c759", bg: "rgba(52,199,89,0.12)" },
};

export const SCREENSHOT_DISPLAY_TYPES = {
  APP_IPHONE_35: { label: 'iPhone 3.5"', category: "iPhone" },
  APP_IPHONE_40: { label: 'iPhone 4"', category: "iPhone" },
  APP_IPHONE_47: { label: 'iPhone 4.7"', category: "iPhone" },
  APP_IPHONE_55: { label: 'iPhone 5.5"', category: "iPhone" },
  APP_IPHONE_58: { label: 'iPhone 5.8"', category: "iPhone" },
  APP_IPHONE_61: { label: 'iPhone 6.1"', category: "iPhone" },
  APP_IPHONE_65: { label: 'iPhone 6.5"', category: "iPhone" },
  APP_IPHONE_67: { label: 'iPhone 6.7"', category: "iPhone" },
  APP_IPAD_97: { label: 'iPad 9.7"', category: "iPad" },
  APP_IPAD_105: { label: 'iPad 10.5"', category: "iPad" },
  APP_IPAD_PRO_3GEN_11: { label: 'iPad Pro 11"', category: "iPad" },
  APP_IPAD_PRO_129: { label: 'iPad Pro 12.9"', category: "iPad" },
  APP_IPAD_PRO_3GEN_129: { label: 'iPad Pro 12.9" (3rd gen)', category: "iPad" },
  APP_WATCH_SERIES_4: { label: "Apple Watch Series 4", category: "Apple Watch" },
  APP_WATCH_ULTRA: { label: "Apple Watch Ultra", category: "Apple Watch" },
};

export const SCREENSHOT_MAX_COUNT = 10;

export const LOCALE_DISPLAY_NAMES = {
  "ar-SA": "Arabic",
  "ca": "Catalan",
  "cs": "Czech",
  "da": "Danish",
  "de-DE": "German",
  "el": "Greek",
  "en-AU": "English (Australia)",
  "en-CA": "English (Canada)",
  "en-GB": "English (U.K.)",
  "en-US": "English (U.S.)",
  "es-ES": "Spanish (Spain)",
  "es-MX": "Spanish (Mexico)",
  "fi": "Finnish",
  "fr-CA": "French (Canada)",
  "fr-FR": "French (France)",
  "he": "Hebrew",
  "hi": "Hindi",
  "hr": "Croatian",
  "hu": "Hungarian",
  "id": "Indonesian",
  "it": "Italian",
  "ja": "Japanese",
  "ko": "Korean",
  "ms": "Malay",
  "nl-NL": "Dutch",
  "no": "Norwegian",
  "pl": "Polish",
  "pt-BR": "Portuguese (Brazil)",
  "pt-PT": "Portuguese (Portugal)",
  "ro": "Romanian",
  "ru": "Russian",
  "sk": "Slovak",
  "sv": "Swedish",
  "th": "Thai",
  "tr": "Turkish",
  "uk": "Ukrainian",
  "vi": "Vietnamese",
  "zh-Hans": "Chinese (Simplified)",
  "zh-Hant": "Chinese (Traditional)",
};


export const SUBSCRIPTION_PERIODS = [
  { value: "ONE_WEEK", label: "1 Week" },
  { value: "ONE_MONTH", label: "1 Month" },
  { value: "TWO_MONTHS", label: "2 Months" },
  { value: "THREE_MONTHS", label: "3 Months" },
  { value: "SIX_MONTHS", label: "6 Months" },
  { value: "ONE_YEAR", label: "1 Year" },
];

export const CI_ACTION_TYPES = [
  { value: "BUILD", label: "Build" },
  { value: "ANALYZE", label: "Analyze" },
  { value: "TEST", label: "Test" },
  { value: "ARCHIVE", label: "Archive" },
];

export const CI_PLATFORMS = [
  { value: "IOS", label: "iOS" },
  { value: "MACOS", label: "macOS" },
  { value: "TVOS", label: "tvOS" },
  { value: "WATCHOS", label: "watchOS" },
  { value: "VISIONOS", label: "visionOS" },
];

export const CI_SCHEDULE_FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "DAILY", label: "Daily" },
  { value: "HOURLY", label: "Hourly" },
];

export const CI_DAYS_OF_WEEK = [
  { value: "SUNDAY", label: "Sun" },
  { value: "MONDAY", label: "Mon" },
  { value: "TUESDAY", label: "Tue" },
  { value: "WEDNESDAY", label: "Wed" },
  { value: "THURSDAY", label: "Thu" },
  { value: "FRIDAY", label: "Fri" },
  { value: "SATURDAY", label: "Sat" },
];
