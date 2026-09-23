/**
 * Persian typography, numeral formatting, and search normalization helpers
 */

// Convert English digits to Persian digits
export function toPersianDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = input.toString();
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

// Convert Persian digits to English digits
export function toEnglishDigits(str: string): string {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    result = result.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  return result;
}

// Format numbers with comma separators and Persian digits
export function formatPersianNumber(num: number | string): string {
  if (num === undefined || num === null) return '';
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return toPersianDigits(parts.join('.'));
}

// Format price in Tomans
export function formatToman(num: number): string {
  return `${formatPersianNumber(num)} تومان`;
}

// Normalize Persian string for resilient searching
export function normalizePersian(text: string): string {
  if (!text) return '';
  return text
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[\u200c\u200b\u200e\u200f]/g, ' ') // ZWNJ and invisible marks replaced with spaces for searching
    .replace(/[\u064B-\u065F]/g, '') // remove Arabic diacritics / vowels
    .replace(/[ـ\-_]/g, '') // remove tatweel / dashes
    .trim()
    .toLowerCase();
}

// Convert Jalali (Shamsi) date YYYY/MM/DD to Gregorian Date object
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  jy += 1595;
  let days = -355668 + (365 * jy) + Math.floor((33 * jy + 3) / 135) + 
    (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186) + jd;
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && days >= sal_a[gm]) {
    days -= sal_a[gm];
    gm++;
  }
  return new Date(Date.UTC(gy, gm - 1, days + 1, 12, 0, 0));
}

// Parse Persian or standard date string into Gregorian Date
export function parseDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  // Clean all hidden unicode bidi marks and non-printable characters
  const clean = toEnglishDigits(String(dateStr).replace(/[\u200e\u200f\u202a-\u202e\u061c\u200b\u200c]/g, '').trim());
  
  // Try ISO / standard timestamp first
  if (clean.includes('T') || (clean.includes('-') && clean.length >= 10 && !clean.includes('/'))) {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) return d;
  }

  // Check for Shamsi YYYY/MM/DD or YYYY-MM-DD
  const parts = clean.split(/[/\\-]/).map((p) => parseInt(p, 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    let [year, month, day] = parts;
    if (year > 1300 && year < 1500) {
      // Jalali year
      return jalaliToGregorian(year, month, day);
    } else if (year >= 1900) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// Calculate remaining days from current UTC/World time to due date
export function getDaysRemaining(dueDateStr?: string | null, dueDateIso?: string | null): number {
  if (!dueDateStr && !dueDateIso) return 0;
  
  let dueDate: Date | null = null;
  if (dueDateIso) {
    const parsedIso = new Date(dueDateIso);
    if (!isNaN(parsedIso.getTime())) {
      dueDate = parsedIso;
    }
  }
  
  if (!dueDate && dueDateStr) {
    dueDate = parseDateSafe(dueDateStr);
  }
  
  if (!dueDate) return 0;

  // Global / World UTC time comparison
  const now = new Date();
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcDue = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());

  const diffTime = utcDue - utcNow;
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return isNaN(days) ? 0 : days;
}

// Check if library is currently open based on default and admin rules
export function isLibraryOpenNow(overrides?: {
  is_temporarily_closed?: boolean;
  exceptional_open?: boolean;
}): { isOpen: boolean; statusText: string; detailText: string } {
  if (overrides?.exceptional_open) {
    return {
      isOpen: true,
      statusText: 'باز است',
      detailText: 'کتابخانه امروز به صورت استثنایی باز می‌باشد',
    };
  }

  if (overrides?.is_temporarily_closed) {
    return {
      isOpen: false,
      statusText: 'بسته است',
      detailText: 'تعطیلی موقت با اعلام مسئول کتابخانه',
    };
  }

  // Get current time in Iran (Tehran is UTC+3:30)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const tehranTime = new Date(utc + 3600000 * 3.5);

  const dayOfWeek = tehranTime.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  const hour = tehranTime.getHours();
  const minute = tehranTime.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // Friday is day 5 (جمعه) -> Closed
  if (dayOfWeek === 5) {
    return {
      isOpen: false,
      statusText: 'بسته است',
      detailText: 'جمعه‌ها کتابخانه تعطیل است (شروع مجدد: شنبه ساعت ۱۳:۰۰)',
    };
  }

  // Working hours: 13:00 (780 mins) to 20:00 (1200 mins)
  const openMinutes = 13 * 60;
  const closeMinutes = 20 * 60;

  if (totalMinutes >= openMinutes && totalMinutes < closeMinutes) {
    const remainingMinutes = closeMinutes - totalMinutes;
    const remHour = Math.floor(remainingMinutes / 60);
    const remMin = remainingMinutes % 60;
    return {
      isOpen: true,
      statusText: 'باز است',
      detailText: `تا ساعت ۲۰:۰۰ باز است (${toPersianDigits(remHour > 0 ? `${remHour} ساعت و ${remMin} دقیقه` : `${remMin} دقیقه`)} تا پایان وقت)`,
    };
  }

  if (totalMinutes < openMinutes) {
    const untilOpen = openMinutes - totalMinutes;
    const h = Math.floor(untilOpen / 60);
    const m = untilOpen % 60;
    return {
      isOpen: false,
      statusText: 'بسته است',
      detailText: `ساعت کار: ۱۳:۰۰ تا ۲۰:۰۰ (${toPersianDigits(h > 0 ? `${h} ساعت و ${m} دقیقه` : `${m} دقیقه`)} تا بازگشایی)`,
    };
  }

  return {
    isOpen: false,
    statusText: 'بسته است',
    detailText: 'ساعت کاری امروز (۱۳:۰۰ الی ۲۰:۰۰) به پایان رسیده است',
  };
}
