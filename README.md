# Codex RTL Windows

هذا المجلد يحفظ حل تشغيل Codex Desktop محليًا بواجهة عربية RTL على ويندوز.

## الملفات المهمة

- `build-codex-rtl-local.mjs`: يعيد بناء نسخة محلية معدلة من تطبيق Codex الرسمي.
- `launch-codex-rtl-local.ps1`: يفتح النسخة المحلية المعدلة.
- `create-codex-rtl-shortcut.vbs`: يحدث اختصار سطح المكتب.
- `_handoff/PROJECT_MAP.md`: خريطة الحالة والقرارات.
- `tools/github-autopush.ps1`: يعمل commit ثم push تلقائيًا عند وجود remote باسم `origin`.

## ما لا يرفع إلى GitHub

النسخ المحلية الثقيلة مثل `_codex_rtl_app_v9` لا ترفع. يمكن إعادة بنائها من السكربت.

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
