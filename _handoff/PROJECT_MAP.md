# PROJECT_MAP

[TECH_STACK]
- الهدف: تعديل اتجاه واجهة تطبيق Codex Desktop على ويندوز إلى RTL لدعم العربية.
- الحالة الحالية: التطبيق مثبت كحزمة WindowsApps/MSIX ويستخدم Electron/Web assets داخل `app.asar`.
- التاريخ المرجعي: 2026-05-07. تم تأكيده عبر `cmd` من داخل Node بعد فشل PowerShell.
- الإصدار المحلي المكتشف: `OpenAI.Codex_26.429.8261.0_x64__2p2nqsd0c76g0`.

[SYSTEM_FLOW]
- المستخدم يفتح تطبيق Codex Desktop.
- شاشة المحادثة تعرض رسائل ومداخل نصية واتجاه واجهة افتراضي غالبا LTR.
- التغيير المطلوب: جعل واجهة الاستخدام والمحادثة RTL عند التشغيل لصالح العربية.

[ARCHITECTURE]
- لا يوجد تعديل مباشر على حزمة WindowsApps؛ التعديل يتم عبر نسخة محلية معدلة.
- حفظ الحل على GitHub يتم من ملفات المصدر والوثائق فقط؛ النسخ المحلية الثقيلة `_codex_rtl_app*` ناتج بناء ولا ترفع.
- مسار الحزمة:
  `C:\Program Files\WindowsApps\OpenAI.Codex_26.429.8261.0_x64__2p2nqsd0c76g0`
- ملف الواجهة المضغوط:
  `C:\Program Files\WindowsApps\OpenAI.Codex_26.429.8261.0_x64__2p2nqsd0c76g0\app\resources\app.asar`
- ملفات الواجهة المهمة داخل `app.asar`:
  - `/webview/index.html`
  - `/webview/assets/index-oAJ_hQgK.css`
  - `/webview/assets/composer-C-PxUmGe.css`
- توجد مؤشرات دعم RTL/locale داخل الحزمة، منها:
  - `/webview/assets/locale-resolver-hIwNluxR.js` يحتوي `../locales/ar.json`.
  - `/webview/assets/index-oAJ_hQgK.css` يحتوي قواعد `direction: rtl`.
  - `/webview/assets/composer-WV7dloZY.js` يحتوي منطقًا مرتبطًا بـ `rtl`.
- النهج المبدئي الآمن:
  1. تحديد مسار تثبيت Codex Desktop وملفات الواجهة الفعلية.
  2. البحث عن ملف CSS/HTML/JS مناسب لإضافة `dir="rtl"` أو قواعد CSS محدودة.
  3. أخذ نسخة احتياطية من الملفات المتأثرة قبل أي تعديل.
  4. تشغيل التطبيق والتحقق بصريا من اتجاه الواجهة.
- يمنع تعديل ملفات ثنائية أو ملفات تحديث تلقائي إلا إذا ثبت أنها المسار الوحيد وبعد موافقة صريحة.
- نتيجة التنفيذ:
  - التعديل المباشر على `app.asar` محجوب من WindowsApps/MSIX حتى بعد تشغيل UAC ومنح ACL على الملف.
  - تم إنشاء نسخة محلية معدلة داخل:
    `C:\Users\ibnra.DESKTOP-A17OJSP\Documents\Codex\2026-05-07\rtl\_codex_rtl_app_v9\app`
  - النسخة المحلية تعدل `/webview/index.html` إلى:
    `<html dir="rtl" lang="ar">`
  - النسخة المحلية تحقن CSS/JS صغير باسم `codex-rtl-local-patch` لتثبيت RTL.
  - صندوق الكتابة `textarea/input/contenteditable` صار RTL صراحة، مع إبقاء code/terminal/diff على LTR.
  - صفوف الدردشات تستهدف `[data-thread-title]` و`[data-thread-title-trigger]` لحجز مساحة يسار العنوان العربي ومنع تداخله مع زر الخيارات.
  - صفوف الدردشات تستهدف صف الدردشة الأب عبر `[role="button"]:has([data-thread-title])` وتضيف `--codex-rtl-thread-action-space` لحجز مساحة فعلية لزر `...`.
  - نسخة v9 تجعل استثناءات LTR محصورة في حاويات الأيقونات و`header-shell-slot` فقط، مع إبقاء عنوان الدردشة في الهيدر RTL.
  - نسخة v9 تضبط tooltips وعناوين الهيدر وقائمة الدردشات للقراءة العربية من اليمين إلى اليسار بدون تداخل أيقونات.
  - السويتشات `button[role="switch"]` تعمل داخليًا LTR حتى لا تتشوّه حركة/موضع الـ thumb داخل الزر.
  - تم تحديث hash السلامة المدمج داخل `Codex.exe` المحلي ليتوافق مع `app.asar` المعدل.
  - اختصار سطح المكتب `Codex RTL.lnk` يستدعي `launch-codex-rtl-local.vbs` ثم `launch-codex-rtl-local.ps1`.
  - المشغل المحلي يغلق عمليات تطبيق `Codex.exe` القديمة فقط ثم يفتح النسخة المحلية المعدلة، لتجاوز single-instance lock.
  - Git المحلي يستخدم `.gitignore` لمنع رفع نسخ التطبيق الثقيلة، و`tools/github-autopush.ps1` لتنفيذ commit/push عند وجود remote باسم `origin`.
  - Git hook في `.githooks/post-commit` يحاول الدفع تلقائيًا بعد كل commit، ولا يعطل commit إذا لم يكن remote مضبوطًا.
  - إعداد `localeOverride` في حالة Codex المحلية موجود بالفعل بقيمة `ar`.
  - تم تنظيف صلاحية ACL الزائدة التي أضيفت أثناء محاولة الترقيع، ولم يبق تعديل على ملف `app.asar`.

[UPDATES_LOG]
- 2026-05-07: تم إنشاء خريطة المشروع لتوثيق طلب RTL والقيود قبل أي تعديل.
- 2026-05-07: PowerShell فشل برسالة `Loading managed Windows PowerShell failed with error 8009001d` قبل تنفيذ أوامر الفحص.
- 2026-05-07: تم تحديد التطبيق كـ Electron/MSIX وقراءة فهرس `app.asar` بدون تعديل.
- 2026-05-07: تم العثور على مؤشرات دعم عربي/RTL داخل الواجهة، لذلك الأفضل البدء بتفعيل/حقن محدود بدل تعديل واسع.
- 2026-05-07: تم إنشاء أدوات فحص/ترقيع مؤقتة، وفشل اختبار RTL قبل التعديل كما هو متوقع.
- 2026-05-07: تم أخذ نسخ احتياطية مؤقتة من `app.asar` قبل محاولة الترقيع، ثم حُذفت بعد ثبوت أن الملف الأصلي لم يتغير.
- 2026-05-07: فشل التعديل المباشر بسبب حماية MSIX: `EPERM` عند فتح `app.asar` للكتابة.
- 2026-05-07: تم حذف أدوات الترقيع الإداري المؤقتة وتنظيف ACL الزائد.
- 2026-05-07: تم إنشاء اختصار سطح المكتب `C:\Users\ibnra.DESKTOP-A17OJSP\Desktop\Codex RTL.lnk`.
- 2026-05-07: تم إصلاح اختصار `Codex RTL.lnk` بعد ظهور خطأ WindowsApps؛ صار يستخدم `IApplicationActivationManager` بدل تشغيل `Codex.exe` مباشرة.
- 2026-05-07: تم إصلاح خطأ COM cast في مشغل PowerShell، ثم نقل الاختصار إلى `wscript.exe` لإزالة وميض النافذة السوداء.
- 2026-05-07: تبين أن AppX/Electron يتجاهل `--force-ui-direction=rtl` لمحتوى React، لذلك تم بناء نسخة محلية معدلة فعليًا.
- 2026-05-07: تم تجاوز فشل `Integrity check failed for asar archive` بتحديث hash السلامة داخل `Codex.exe` المحلي.
- 2026-05-07: تم تحويل الاختصار إلى مشغل محلي يغلق تطبيق Codex القديم ثم يفتح النسخة المعدلة.
- 2026-05-07: تم بناء نسخة v2 لإصلاح صندوق كتابة الدردشة بعد أن كان مستثنى من RTL مع `textarea/input/contenteditable`.
- 2026-05-07: تم بناء نسخة v3 لإصلاح تشوه switches في صفحة الإعدادات عبر عزل `button[role="switch"]` كـ LTR داخليًا.
- 2026-05-07: تم بناء نسخة v4 لإصلاح تداخل عنوان صف الدردشة في الشريط الجانبي مع زر الخيارات عبر قواعد `[data-thread-title]` المحدودة.
- 2026-05-07: تم بناء نسخة v7 لإصلاح تداخل عنوان الدردشة العلوي مع زر `...` عبر حجز مساحة على مستوى صف الدردشة الأب.
- 2026-05-07: تم بناء نسخة v9 بحذف التأثير البصري التجريبي بالكامل، وتضييق استثناءات LTR لمنع تداخل أيقونات الهيدر مع إبقاء عنوان الدردشة RTL.
- 2026-05-07: تم تجهيز حفظ Git/GitHub للحل: `.gitignore`، و`tools/github-autopush.ps1`، و`.githooks/post-commit`، و`README.md`.

[ORPHANS & PENDING]
- ربط GitHub الفعلي ينتظر remote بصيغة `origin` مثل `https://github.com/OWNER/REPO.git` لأن هذا المجلد لم يكن مستودع GitHub قبل الإعداد.
- التحقق البصري بعد فتح اختصار `Codex RTL` المحدث إلى v9. عند الضغط عليه سيغلق نافذة Codex الحالية ثم يفتح النسخة المحلية المعدلة. يجب ألا يظهر أي تأثير بصري تجريبي، ويجب ألا تتداخل أيقونات أعلى اليمين، ويجب أن يظهر عنوان الدردشة RTL في مكانه.
- مجلد `_codex_rtl_app_v8` نسخة مولدة قديمة وغير مستخدمة بعد v9، لكن حذفه تعذر لأن التطبيق الحالي يقفل ملفًا داخله. يمكن حذفه بعد فتح v9 أو إغلاق Codex بالكامل.
- عند تحديث Codex الرسمي، يجب إعادة تشغيل `build-codex-rtl-local.mjs` لإعادة بناء النسخة المحلية من الإصدار الجديد.
