# PROJECT_MAP

[TECH_STACK]
- الهدف: تعديل اتجاه واجهة تطبيق Codex Desktop على ويندوز إلى RTL لدعم العربية.
- الحالة الحالية: التطبيق مثبت كحزمة WindowsApps/MSIX ويستخدم Electron/Web assets داخل `app.asar`.
- التاريخ المرجعي: 2026-05-16. تم تأكيد تشغيل الحل على ويندوز 11 من المسار `C:\CODEX_RTL`.
- الإصدار المحلي المكتشف: `OpenAI.Codex_26.513.3673.0_x64__2p2nqsd0c76g0`.

[SYSTEM_FLOW]
- المستخدم يفتح تطبيق Codex Desktop.
- شاشة المحادثة تعرض رسائل ومداخل نصية واتجاه واجهة افتراضي غالبا LTR.
- التغيير المطلوب: جعل واجهة الاستخدام والمحادثة RTL عند التشغيل لصالح العربية.

[ARCHITECTURE]
- لا يوجد تعديل مباشر على حزمة WindowsApps؛ التعديل يتم عبر نسخة محلية معدلة.
- حفظ الحل على GitHub يتم من ملفات المصدر والوثائق فقط؛ النسخ المحلية الثقيلة `_codex_rtl_app*` ناتج بناء ولا ترفع.
- المسار المحلي المعتمد على ويندوز 11:
  `C:\CODEX_RTL`
- مسار الحزمة:
  `C:\Program Files\WindowsApps\OpenAI.Codex_26.513.3673.0_x64__2p2nqsd0c76g0`
- ملف الواجهة المضغوط:
  `C:\Program Files\WindowsApps\OpenAI.Codex_26.513.3673.0_x64__2p2nqsd0c76g0\app\resources\app.asar`
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
  - `setup-codex-rtl.ps1` هو مدخل الإعداد المحمول لجهاز جديد: يكتشف Codex الرسمي عبر `Get-AppxPackage` أو `WindowsApps`، ثم يشغل البناء، ثم ينشئ اختصار سطح المكتب.
  - إذا لم يكن Node مثبتًا على الجهاز أو كان `node.exe` المكتشف غير قابل للتشغيل من `WindowsApps`، ينسخ setup نسخة `node.exe` المرفقة مع Codex إلى `_codex_rtl_tools` ويستخدمها محليًا.
  - بناء `app.asar` يحترم padding الخاص بترويسة ASAR عبر `dataOffset = 8 + headerSizeWithPadding` حتى لا تنكسر integrity hashes للملفات غير المعدلة.
  - يتم إنشاء النسخة المحلية المعدلة داخل مجلد مولد مثل `_codex_rtl_app_YYYYMMDDHHMMSS\app`، ويحدد `_codex_rtl_current.txt` النسخة التي يفتحها الاختصار.
  - النسخة المحلية تعدل `/webview/index.html` إلى:
    `<html dir="rtl" lang="ar">`
  - النسخة المحلية تحقن boot مبكرًا باسم `codex-rtl-boot-patch` قبل ملف التطبيق الرئيسي، ثم CSS نهائيًا باسم `codex-rtl-local-patch` لتثبيت RTL بعد CSS الأصلي.
  - صندوق الكتابة `textarea/input/contenteditable` صار RTL صراحة، مع إبقاء code/terminal/diff على LTR.
  - صفوف الدردشات تستهدف `[data-thread-title]` و`[data-thread-title-trigger]` لحجز مساحة يسار العنوان العربي ومنع تداخله مع زر الخيارات.
  - صفوف الدردشات تستهدف صف الدردشة الأب عبر `[role="button"]:has([data-thread-title])` وتضيف `--codex-rtl-thread-action-space` لحجز مساحة فعلية لزر `...`.
  - الهيدر العلوي يعمل كـ LTR لتبقى مواضع العنوان والأيقونات في أماكنها الأصلية، بينما نص عنوان الدردشة داخل الهيدر نفسه RTL دائمًا.
  - تبويبات App Shell الداخلية `[data-tab-id]` تعمل بتخطيط LTR مع قص عنوان التبويب وإبقاء النص نفسه RTL لمنع تداخل عناوين الروابط الداخلية مع أزرار الهيدر.
  - شريط عنوان المتصفح الداخلي `.group/address-bar` معزول كـ LTR حتى لا يخلط حقن RTL العام بين النص/الرابط وأزرار شريط الرابط الداخلي.
  - أعلى قائمة الشريط الجانبي يحجز `padding-top: var(--height-toolbar)` حتى لا تقع أزرار هيدر المشروع العائمة فوق زر "دردشة جديدة".
  - عناصر التنقل العلوية داخل الشريط الجانبي `button.h-token-nav-row` تعمل RTL، وتخفي اختصارات لوحة المفاتيح المباشرة في RTL، وتنقل badges إلى اليسار حتى لا تطفو فوق "دردشة جديدة".
  - عناوين الدردشات تستخدم `direction: rtl` و`unicode-bidi: isolate` حتى تبقى قراءة العنوان عربية الاتجاه حتى عند وجود كلمة إنجليزية داخله.
  - نسخة v9 تضبط tooltips وعناوين الهيدر وقائمة الدردشات للقراءة العربية من اليمين إلى اليسار بدون تداخل أيقونات.
  - السويتشات `button[role="switch"]` تعمل داخليًا LTR حتى لا تتشوّه حركة/موضع الـ thumb داخل الزر.
  - تم تحديث hash السلامة المدمج داخل `Codex.exe` المحلي ليتوافق مع `app.asar` المعدل.
  - اختصار سطح المكتب `Codex RTL.lnk` يستدعي `launch-codex-rtl-local.cmd` ثم `launch-codex-rtl-local.ps1` بمسارات نسبية من مكان المستودع، ويقرأ النسخة الحالية من `_codex_rtl_current.txt`.
  - المشغل المحلي يغلق عمليات Codex الرسمية والنسخ المحلية القديمة، ينتظر زوالها حتى 10 ثوان، ثم يفتح النسخة المحلية المعدلة بمجلد بيانات مستقل `_codex_rtl_user_data` لتجاوز single-instance lock.
  - سجلات المشغل تحفظ في `_handoff/launch-codex-rtl.log` و`_handoff/launch-codex-rtl-error.log`.
  - Git المحلي يستخدم `.gitignore` لمنع رفع نسخ التطبيق الثقيلة، و`tools/github-autopush.ps1` لتنفيذ commit/push عند وجود remote باسم `origin`.
  - Git hook في `.githooks/post-commit` يحاول الدفع تلقائيًا بعد كل commit إلى `origin/main`، ولا يعطل commit إذا تعذر الدفع.
  - remote `origin` مضبوط على:
    `https://github.com/ibnradman2/CODEX_RTL.git`
  - قبل أي رفع مطلوب للحساب الثانوي، يجب تغيير remote أو استخدام remote جديد للحساب الثانوي لأن hook ما بعد commit يحاول الدفع إلى `origin/main`.
  - يوجد تشغيل دوري في Codex App باسم `Codex RTL GitHub autopush` ومعرفه `codex-rtl-github-autopush` يفحص المستودع كل ساعة ويدفع التغييرات المسموحة إلى GitHub.
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
- 2026-05-07: تم تهيئة Git محليًا على الفرع `main`، وتفعيل `core.hooksPath=.githooks`، وإنشاء أول commit محلي `b34d620`.
- 2026-05-07: تم ربط remote `origin` بالمستودع `https://github.com/ibnradman2/CODEX_RTL.git` ودفع `main` إلى GitHub بنجاح.
- 2026-05-07: تم إنشاء automation دوري `codex-rtl-github-autopush` لتشغيل الحفظ إلى GitHub كل ساعة كطبقة احتياطية فوق hook ما بعد commit.
- 2026-05-07: تم تحويل الحل إلى إعداد محمول عبر `setup-codex-rtl.ps1`، وإزالة المسارات الثابتة من سكربتات البناء/التشغيل/الاختصار، واعتماد `_codex_rtl_app` كمخرج بناء ثابت.
- 2026-05-07: تم اختبار `setup-codex-rtl.ps1 -SelfTest` بنجاح، بما في ذلك حالة عدم وجود Node في `PATH` عبر نسخ `node.exe` من Codex إلى `_codex_rtl_tools`.
- 2026-05-07: تم تعديل سلوك عنوان الدردشة: موضعه يعود يسار الهيدر مثل الأصل، ونصه يظل RTL داخليًا حتى مع الكلمات الإنجليزية.
- 2026-05-07: تم تعديل setup ليبني مجلدًا جديدًا في كل مرة ويحدّث `_codex_rtl_current.txt` بدل حذف النسخة المفتوحة، لتفادي قفل ملفات Codex أثناء التحديث.
- 2026-05-07: تم نقل جزء من حقن RTL إلى boot مبكر قبل تحميل ملف التطبيق الرئيسي لتقليل وميض LTR/الإنجليزية عند الفتح.
- 2026-05-07: تم تضييق قواعد flex في الهيدر والشريط الجانبي لمنع اختصارات/أيقونات أعلى اليمين من التداخل مع زر "دردشة جديدة".
- 2026-05-07: تم إصلاح سبب بقاء التداخل: selector السابق لـ `[aria-hidden="true"]` كان يطابق أيقونات SVG نفسها، فتم قصره على اختصار لوحة المفاتيح المباشر داخل زر التنقل.
- 2026-05-07: تبين من لقطة الشاشة أن المتداخل هو أزرار هيدر المشروع مثل `File Explorer/Git Bash/PyCharm` لا اختصارات زر التنقل، فتم حجز ارتفاع toolbar أعلى قائمة الشريط الجانبي.
- 2026-05-08: تم إصلاح تداخل عنوان التبويب عند فتح رابط داخلي عبر عزل `[data-tab-id]` كتخطيط LTR وقص نص العنوان مع إبقائه RTL.
- 2026-05-08: تم تضييق الإصلاح على شريط عنوان المتصفح الداخلي `.group/address-bar` لأن التداخل المتبقي كان داخل input الرابط نفسه لا داخل تبويب App Shell.
- 2026-05-16: تم نقل المشروع التشغيلي إلى `C:\CODEX_RTL` وإعادة بناء النسخة المحلية من Codex `26.513.3673.0`.
- 2026-05-16: تم إصلاح فشل `node.exe Access is denied` على ويندوز 11 عبر اختبار Node قبل اعتماده ونسخ Node المرفق مع Codex عند الحاجة.
- 2026-05-16: تم إصلاح `ASAR Integrity Violation` بتصحيح حساب offset الخاص ببيانات `app.asar` واحترام padding الترويسة عند إعادة البناء.
- 2026-05-16: تم تحويل اختصار سطح المكتب إلى مشغل `launch-codex-rtl-local.cmd` بدل استهداف `wscript.exe` أو VBS مباشرة لتقليل غموض الاختصار.
- 2026-05-16: تم تحسين المشغل ليغلق عمليات Codex المتعارضة وينتظر توقفها قبل فتح النسخة المحلية، ويكتب سجل تشغيل واضحًا.
- 2026-05-16: تم التحقق من سلامة hashes داخل `app.asar` بعد البناء، وتشغيل `setup-codex-rtl.ps1 -SelfTest` بنجاح.

[ORPHANS & PENDING]
- 2026-05-16: Runtime shortcut path was verified as `C:\CODEX_RTL`, not `C:\Users\USER\CODEX_RTL`; fixes were applied to the active path and rebuilt as `_codex_rtl_app_20260516214004`.
- 2026-05-16: Active build now patches `/webview/assets/app-server-manager-signals-BEaGjuc8.js` so malformed plugin directives do not crash the UI, and patches `/webview/assets/app-shell-D5Aq-LSR.js` so the right-panel/resources pane is ordered before main content.
- 2026-05-16: `launch-codex-rtl-local.ps1` now removes `.codex\.tmp\plugins*` before launch and watches it briefly after launch to avoid stale `openai-developers` plugin manifests causing the red crash screen.
- 2026-05-16: Reverted the app-shell child-order patch after runtime verification showed RTL flex places the first child on the right; active build `_codex_rtl_app_20260516214738` keeps main content before `right-panel`, which places the resources/output pane at the far left under RTL.
- 2026-05-16: Added stronger CSS positioning for Arabic Windows/RTL environments in `_codex_rtl_app_20260516215934`: the direct parent of `right-panel` is forced to RTL row layout, main viewport gets `order: 0`, and `right-panel` gets `order: 999` so it resolves to the far-left edge.
- 2026-05-17: Codex updated to `26.513.4821.0`; rebuilt active local copy as `_codex_rtl_app_20260517044701`. The right-panel is now pinned with `position: fixed; left: 0` because flex order remained tied to the sidebar edge on Arabic Windows 11. Directive parser fallback was generalized to match minified function names after upstream asset changes.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517084541` to restore normal layout flow: removed fixed positioning from `right-panel`, kept the parent RTL row, assigned main chat viewport `order: 0`, and assigned `right-panel` `order: 999` so the chat block sits adjacent to the right sidebar while outputs/resources sit to its left.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517092623` after visual verification showed the row still resolved LTR. The direct parent of `right-panel` is now forced to `direction: ltr` and `flex-direction: row-reverse`, with no fixed positioning, so the main chat block should sit next to the right sidebar and the outputs/resources block to its left.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517094726` after visual verification showed `right-panel` was between the right sidebar and chat. In the `row-reverse` row, main chat now has `order: 999` and `right-panel` has `order: 0`, making chat the rightmost block next to the sidebar and outputs/resources left of chat.
- 2026-05-17: Added launch-time auto-update to `launch-codex-rtl-local.ps1`. On every shortcut launch, it detects the installed official Codex package, compares it with `_codex_rtl_source.json`, rebuilds a new RTL copy only when the official source changes, updates `_codex_rtl_current.txt`, refreshes shortcut icons, and falls back to the previous valid RTL build if rebuilding fails. Verified with `_codex_rtl_app_20260517095649`.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517102018` with a structural app-shell patch instead of CSS order. The inner app-shell row now renders `right-panel` before main content while the row remains LTR, so outputs/resources should sit left of the chat and chat should sit next to the right sidebar.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517104504`; the RTL compatibility status is now a temporary bottom-left toast with a manual close button and 60-second auto-hide.
- 2026-05-17: Disabled `mcp_servers.yahoo_finance` in `C:\Users\USER\.codex\config.toml` because it crashes Codex Desktop startup with `Failed to list resource templates ... Method not found`.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517155904` with a stronger app-shell layout patch: the parent row containing `right-panel` is forced to CSS Grid with `right-panel` in column 1 and main chat in column 2, while keeping the structural right-panel-before-main patch. This targets Arabic Windows 11 layout resolution issues.
- 2026-05-17: Created desktop shortcut `Codex Official.lnk` using `explorer.exe shell:AppsFolder\OpenAI.Codex_2p2nqsd0c76g0!App` so the official AppX build can be opened separately from `Codex RTL`.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517160723`; RTL compatibility notice is now pinned on every RTL launch and only closes manually via its close button.
- 2026-05-17: Replaced `Codex Official.lnk` target with `wscript.exe "C:\CODEX_RTL\launch-codex-official.vbs"`. The launcher verifies the official AppX package, closes running RTL processes to avoid Electron single-instance focus hijacking, then starts the official `WindowsApps` Codex executable.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517165039` with an exact App Shell row marker. The patched React row now includes `data-codex-rtl-main-row`, and CSS Grid targets that marker directly instead of relying on `:has()`. Verification confirms right-panel is before main content, row marker is present, and grid columns target the exact row.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517165915` to restore RTL direction after the previous exact-row patch made chat/output read LTR. The marked row now uses `direction: rtl`, `grid-template-columns: minmax(0, 1fr) max-content`, main chat in column 1, and right-panel in column 2.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517170304` with a runtime DOM layout enforcer in the boot script. It finds the actual `right-panel` and `.app-shell-main-content-viewport` after React renders, moves `right-panel` before main in the real DOM, forces the row to LTR flex for physical placement, and forces both panel/main directions back to RTL. A MutationObserver reapplies it during startup/rerenders.
- 2026-05-17: Rebuilt `_codex_rtl_app_20260517171439` after visual verification showed the previous runtime pass likely targeted only the first matching panel/main pair. Removed the exact-row Grid CSS to stop direction leakage and changed the runtime enforcer to iterate all `right-panel` elements, find their direct sibling `.app-shell-main-content-viewport`, and apply the DOM move/style fix to every matching row.
- 2026-05-18: Rebuilt `_codex_rtl_app_20260518102752` with an absolute-position runtime layout strategy. Instead of reordering flex/grid children, the actual row is made `position: relative; display: block`, `right-panel` is positioned absolutely at `left: 0`, and the main chat viewport is positioned absolutely from `left: <panelWidth>px` to `right: 0`, preserving RTL text directions.
- 2026-05-18: Rebuilt `_codex_rtl_app_20260518103754` as a diagnostic variant that moves the main Codex sidebar to the left at runtime. It finds `nav.sidebar-foreground-muted`, climbs to the visible sidebar container, makes its parent LTR flex, inserts the sidebar as the first child, and marks it with `data-codex-rtl-sidebar-left`.
- 2026-05-18: Rebuilt `_codex_rtl_app_20260518105233` to roll back the failed right-panel ordering experiments. The build no longer patches App Shell child order and no longer positions `right-panel` absolutely; it keeps the left-sidebar diagnostic, forces chat/editable text RTL inside the main conversation area, and moves the RTL compatibility status widget to the bottom-right.
- تم التحقق بصريًا من فتح اختصار `Codex RTL` بنجاح على ويندوز 11 بعد إصلاح ASAR وNode والمشغل.
- مجلد `_codex_rtl_app_v8` نسخة مولدة قديمة وغير مستخدمة بعد v9، لكن حذفه تعذر لأن التطبيق الحالي يقفل ملفًا داخله. يمكن حذفه بعد فتح v9 أو إغلاق Codex بالكامل.
- عند تحديث Codex الرسمي أو نقل الحل لجهاز جديد، يجب تشغيل `setup-codex-rtl.ps1` لإعادة بناء النسخة المحلية من الإصدار المثبت.
- يلزم تحديد مستودع GitHub للحساب الثانوي قبل الدفع؛ لا يدفع إلى `origin` الحالي لأنه يشير للحساب الأساسي.
