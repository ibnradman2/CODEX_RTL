# Codex RTL Windows

هذا المجلد يحفظ حل تشغيل Codex Desktop محليًا بواجهة عربية RTL على ويندوز.

## الملفات المهمة

- `setup-codex-rtl.ps1`: إعداد كامل لجهاز جديد؛ يكتشف Codex الرسمي، يبني نسخة RTL، وينشئ الاختصار.
- `build-codex-rtl-local.mjs`: يعيد بناء نسخة محلية معدلة من تطبيق Codex الرسمي.
- `launch-codex-rtl-local.ps1`: يفتح النسخة المحلية المعدلة.
- `create-codex-rtl-shortcut.vbs`: يحدث اختصار سطح المكتب.
- `_handoff/PROJECT_MAP.md`: خريطة الحالة والقرارات.
- `tools/github-autopush.ps1`: يعمل commit ثم push تلقائيًا عند وجود remote باسم `origin`.

## ما لا يرفع إلى GitHub

النسخ المحلية الثقيلة مثل `_codex_rtl_app` لا ترفع. يمكن إعادة بنائها من السكربت.
كل تشغيل لـ `setup-codex-rtl.ps1` يبني مجلدًا مولدًا مثل `_codex_rtl_app_YYYYMMDDHHMMSS` ويحدث مؤشرًا محليًا غير مرفوع باسم `_codex_rtl_current.txt`.

## إعداد جهاز جديد

بعد تثبيت Codex الرسمي على الجهاز الجديد:

```powershell
git clone https://github.com/ibnradman2/CODEX_RTL.git
cd CODEX_RTL
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-codex-rtl.ps1
```

بعد انتهاء السكربت افتح اختصار سطح المكتب `Codex RTL`.

السكربت لا يحتاج Node مثبتًا مسبقًا. إذا لم يجد `node.exe` في النظام، ينسخ نسخة Node المرفقة مع Codex إلى `_codex_rtl_tools` ويستخدمها محليًا.

## ربط GitHub

المستودع الحالي مربوط بـ:

```text
https://github.com/ibnradman2/CODEX_RTL.git
```

إذا احتجت إعادة الربط من جديد:

```powershell
git remote add origin https://github.com/ibnradman2/CODEX_RTL.git
.\tools\github-autopush.ps1 -Commit -Message "Update Codex RTL solution"
```

بعد ذلك، أي commit محلي سيحاول الدفع تلقائيًا إلى GitHub عبر hook `post-commit`.
