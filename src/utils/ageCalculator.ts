/**
 * Precise chronological age calculator for Jalali (Shamsi) dates.
 * Calculates exact age in years, months, and days from a Jalali birth date string.
 * 
 * Format: "YYYY/MM/DD" e.g. "1398/05/12"
 */

const JALALI_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

function isJalaliLeapYear(year: number): boolean {
  const remainder = ((year - (year > 0 ? 474 : 473)) % 2820 + 474 + 2820) % 2820;
  return ((remainder + 38) * 682) % 2816 < 682;
}

function jalaliMonthLength(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

function jalaliToJd(year: number, month: number, day: number): number {
  const epbase = year - (year >= 0 ? 474 : 473);
  const epyear = 474 + (epbase % 2820 + 2820) % 2820;
  return (
    day +
    (month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6) +
    Math.floor((epyear * 682 - 110) / 2816) +
    (epyear - 1) * 365 +
    Math.floor(epbase / 2820) * 1029983 +
    1948319.5
  );
}

function jdToJalali(jd: number): { year: number; month: number; day: number } {
  const jdn = Math.floor(jd) + 1;
  const cycle = Math.floor((jdn - 2121446) / 1029983);
  let remaining = (jdn - 2121446) % 1029983;
  if (remaining === 1029982) {
    return { year: 2820 * cycle + 2820, month: 12, day: 29 };
  }
  const a = Math.floor(remaining / 366);
  remaining = remaining % 366;
  let year = 2820 * cycle + 474 + a;
  if (a >= 2137) {
    year++;
  }
  // Recalculate day of year
  const dayOfYear = jdn - jalaliToJd(year, 1, 1) + 1;
  let month: number;
  if (dayOfYear <= 186) {
    month = Math.ceil(dayOfYear / 31);
  } else {
    month = Math.ceil((dayOfYear - 6) / 30);
  }
  const day = jdn - jalaliToJd(year, month, 1) + 1;
  return { year, month, day };
}

function parseJalaliDate(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).split("/");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

function getCurrentJalaliDate(): { year: number; month: number; day: number } {
  // Approximate: convert today's Gregorian to Jalali
  const now = new Date();
  const gy = now.getFullYear();
  const gm = now.getMonth() + 1;
  const gd = now.getDate();
  return gregorianToJalali(gy, gm, gd);
}

function gregorianToJalali(gy: number, gm: number, gd: number): { year: number; month: number; day: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number, jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { year: jy, month: jm, day: jd };
}

export interface AgeResult {
  years: number;
  months: number;
  days: number;
  formatted: string; // e.g. "۴ سال و ۸ ماه و ۶ روز"
  totalMonths: number;
}

/**
 * Calculate exact chronological age from a Jalali birth date string.
 * @param birthDateStr - format "YYYY/MM/DD" e.g. "1398/05/12"
 * @param referenceDate - optional Jalali date to compute against (defaults to today)
 * @returns AgeResult with years, months, days, formatted string
 */
export function calculateExactAge(birthDateStr: string, referenceDate?: { year: number; month: number; day: number }): AgeResult | null {
  const birth = parseJalaliDate(birthDateStr);
  if (!birth) return null;
  
  const today = referenceDate || getCurrentJalaliDate();
  
  let years = today.year - birth.year;
  let months = today.month - birth.month;
  let days = today.day - birth.day;
  
  if (days < 0) {
    months--;
    // Get days in the previous month of the reference date
    const prevMonth = today.month === 1 ? 12 : today.month - 1;
    const prevMonthYear = today.month === 1 ? today.year - 1 : today.year;
    days += jalaliMonthLength(prevMonthYear, prevMonth);
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const totalMonths = years * 12 + months;
  
  // Format with Persian numerals
  const toPersian = (n: number) => n.toString().replace(/[0-9]/g, d => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
  
  const parts: string[] = [];
  if (years > 0) parts.push(`${toPersian(years)} سال`);
  if (months > 0) parts.push(`${toPersian(months)} ماه`);
  if (days > 0) parts.push(`${toPersian(days)} روز`);
  
  const formatted = parts.join(" و ") || "۰ روز";
  
  return { years, months, days, formatted, totalMonths };
}

/**
 * Format age for display in assessment forms.
 * Returns a shorter format: "X سال و Y ماه"
 */
export function formatAgeForAssessment(birthDateStr: string): string {
  const age = calculateExactAge(birthDateStr);
  if (!age) return "نامشخص";
  
  const toPersian = (n: number) => n.toString().replace(/[0-9]/g, d => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
  
  if (age.years > 0 && age.months > 0) {
    return `${toPersian(age.years)} سال و ${toPersian(age.months)} ماه`;
  } else if (age.years > 0) {
    return `${toPersian(age.years)} سال`;
  } else {
    return `${toPersian(age.months)} ماه`;
  }
}
