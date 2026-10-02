# سامانه پایش، ارزیابی، همسویی و فالوآپ کودک

نسخه پیشرفته و کامل (Refactored) مطابق با الزامات رسمی.

## ساختار پروژه
- `src/types.ts`: تایپ‌ها و اینترفیس‌های Domain شامل User, Child, TeacherAssessment, ParentAssessment, AlignmentResult, FollowUp.
- `src/server/db.ts`: لایه Data Access برای مدیریت `data.json`.
- `src/server/api.ts`: کنترلرهای API برای احراز هویت (bcrypt)، ثبت فرم‌ها، و فالوآپ.
- `src/server/scoringEngine.ts`: موتور محاسبه‌گر نمرات TPCS و PPCS همراه با زیرمقیاس‌ها و نقاط برش.
- `src/server/alignmentEngine.ts`: موتور مقایسه نمرات مربی و والد برای پیشنهاد مسیر.
- `src/server/followUpEngine.ts`: موتور ارزیابی پیشرفت فالوآپ‌ها.
- `src/pages/TeacherForm.tsx` & `ParentForm.tsx`: رابط کاربری کاملاً منطبق بر ساختار رسمی.

## دستورات اجرای پروژه
نصب وابستگی‌ها:
```bash
npm install
```

### نقشهٔ کد با Graphify
برای اینکه پیش از تغییرات، ارتباط بخش‌های پروژه بررسی شود، Graphify را نصب و نقشهٔ محلی کد را بسازید:
```bash
uv tool install graphifyy
graphify extract . --code-only
```
بعد از تغییر کد، نقشه را به‌روز کنید:
```bash
graphify update .
```
خروجی نقشه در `graphify-out/` ساخته می‌شود و در Git ثبت نمی‌شود؛ بنابراین هر محیط آن را محلی و از روی کد خودش تولید می‌کند. راهنمای Codex پروژه در `AGENTS.md` و skill در `.codex/skills/graphify/` قرار دارد.

اجرای نسخه توسعه (Development):
```bash
npm run dev
```

اجرای سرور:
```bash
npm run server
```

اگر پورت پیش‌فرض `5173` اشغال باشد، سرور توسعه خودکار پورت‌های بعدی را امتحان می‌کند و نشانی فعال را در ترمینال نشان می‌دهد. برای انتخاب پورت مشخص در ویندوز:
```cmd
set PORT=5174 && npm run dev
```

## معماری و امنیت
- معماری `UI -> API -> Service -> Repository -> Database` پیاده‌سازی شده است.
- پسوردهای کاربران (حتی پسوردهای پیش‌فرض نظیر 4411) در لایه بک‌اند توسط کتابخانه `bcrypt` هش می‌شوند.
- فرم‌های ارسال‌شده با وضعیت `SUBMITTED` و مهر زمانی قفل می‌شوند و هرگونه تغییر در آنها در فایل `AuditLog` ذخیره می‌گردد.
