-- Local / CI fixture manifest only. Supabase loads this after seed.sql during `db reset`.
-- This file is never applied by migrations and is not a hosted DEV/production import tool.
--
-- Titles, module order, lesson order, and explicitly labeled preview flags below are transcribed
-- from the public Odoo course pages observed on 2026-10-11. They are reference metadata, not
-- original course bodies or approval to publish these courses as launch content.
--
-- The Odoo pages do not publish module/lesson duration, requiredness, or a dependable lesson type.
-- The schema's default `is_required = true` is used for local structural fixtures only. `article`
-- is the fixture lesson type. Odoo Development has separately authored English/Arabic demo article
-- material below; that material is not original ETripleSoft course content. Other lessons retain
-- title-only structural data. No video, downloadable resource, or assessment is fabricated here.
-- The source `preview` field is true only where the public page labels a lesson Preview. The
-- separate `demoConfig.preview` value may add explicitly documented demo-only preview behavior.
--
-- Some public pages have incomplete/duplicated crawl output. The repeated Crash Course titles are
-- retained in their displayed positions; System Admin lists 10 steps but only exposes 9 titles.
-- The missing title is recorded in this manifest's notes, not invented as a lesson row.
--
-- Fixture UUIDs are deterministic from the fixture course slug and module/lesson position. Existing
-- fixture entities are never deleted. Do not change parent identities or positions in this seed to
-- represent curriculum revisions; handle those with a reviewed forward data migration so history
-- and any future learner progress remain attached to the original lesson identities.

DO $course_curriculum_fixture$
DECLARE
  v_manifest jsonb := $manifest$
  [
    {
      "slug": "crash-course-odoo-erp",
      "sourceUrl": "https://etriple.odoo.com/slides/crash-course-odoo-erp-2",
      "listedDuration": "10 hours 46 minutes",
      "listedSteps": 10,
      "listedPrice": null,
      "category": null,
      "level": null,
      "notes": "The public crawl exposes two Course Agenda rows and two Business Workflows, ERP Systems & Odoo rows in this order; titles are intentionally retained as displayed.",
      "modules": [
        { "title": "Business Workflow & Introduction Erp", "lessons": [
          { "title": "Course Agenda", "preview": true },
          { "title": "Course Agenda", "preview": true },
          { "title": "Business Workflows, ERP Systems & Odoo", "preview": true },
          { "title": "Business Workflows, ERP Systems & Odoo", "preview": false }
        ]},
        { "title": "Accounting", "lessons": [
          { "title": "Accounting Fundamental", "preview": false },
          { "title": "Session 2 / Accounting Module", "preview": false }
        ]},
        { "title": "Crm / Sales / Purchase / Inventory", "lessons": [
          { "title": "Supply Chain", "preview": false },
          { "title": "Crm / Sales / Purchase / Inventory Session", "preview": false }
        ]},
        { "title": "Business Case", "lessons": [
          { "title": "Business Case", "preview": true }
        ]},
        { "title": "Final Assesment", "lessons": [
          { "title": "Crash Course Odoo ERP", "preview": false }
        ]}
      ]
    },
    {
      "slug": "python-fundamentals",
      "sourceUrl": "https://etriple.odoo.com/slides/python-fundamentals-1",
      "listedDuration": "12 hours 12 minutes",
      "listedSteps": 17,
      "listedPrice": "999.99 EGP",
      "category": null,
      "level": null,
      "modules": [
        { "title": "Introduction to Python", "lessons": [
          { "title": "Python Guide" }, { "title": "What is Python?" }, { "title": "Installing Python & IDEs" }
        ]},
        { "title": "Variables & Data Types", "lessons": [
          { "title": "Variables and naming rules - 1" }, { "title": "Variables and naming rules - 2" }, { "title": "Basic input/output (input(), print())" }
        ]},
        { "title": "Operators", "lessons": [{ "title": "operators" }]},
        { "title": "Control Flow", "lessons": [
          { "title": "Conditional statements" }, { "title": "Loops" }
        ]},
        { "title": "Data Structures", "lessons": [
          { "title": "Lists" }, { "title": "Tuples" }, { "title": "Dictionaries" }
        ]},
        { "title": "Functions", "lessons": [{ "title": "Functions" }]},
        { "title": "Object-Oriented Programming", "lessons": [{ "title": "Intro To OOP" }]},
        { "title": "Practical Exercises & Mini Projects", "lessons": [
          { "title": "Calculator program" }, { "title": "To-do list app (CLI)" }, { "title": "Number guessing game" }
        ]}
      ]
    },
    {
      "slug": "odoo-development",
      "sourceUrl": "https://etriple.odoo.com/slides/odoo-development-3",
      "listedDuration": "21 hours 23 minutes",
      "listedSteps": 8,
      "listedPrice": "1499.99 EGP",
      "category": null,
      "level": null,
      "contentOrigin": "assistant-authored-demo",
      "fixtureOwner": "ETripleSoft Learn repository — local/CI demonstration fixture",
      "contentLabel": "Demo learning content — not original ETripleSoft training material",
      "demoConfiguration": "The first lesson is a demo preview; Search view, filters & group-by and Reference Book are optional demo lessons. These flags are not transcribed source metadata.",
      "courseTranslations": {
        "en": {
          "title": "Odoo Development",
          "summary": "Demo course: practice Odoo development concepts with a fictional service-contract scenario. Lesson materials are illustrative samples, not original ETripleSoft training content.",
          "description": "This local development course is a bilingual LMS demonstration. It uses assistant-authored sample articles and a fictional service company to exercise lessons, exact-locale content, required/optional flags, and preview access. The learning material is not original ETripleSoft training content or a production implementation guide."
        },
        "ar": {
          "title": "تطوير Odoo",
          "summary": "دورة تجريبية: تعلّم مفاهيم تطوير Odoo من خلال سيناريو افتراضي لعقود الخدمات. المواد أمثلة توضيحية وليست محتوى تدريبياً أصلياً من ETripleSoft.",
          "description": "هذه الدورة مخصصة لعرض نظام التعلم في بيئة التطوير المحلية، وتستخدم مقالات تجريبية أعدها المساعد وشركة خدمات افتراضية لاختبار الدروس والمحتوى الدقيق حسب اللغة وإعدادات الإلزام والمعاينة. المادة التعليمية ليست محتوى تدريبياً أصلياً من ETripleSoft ولا دليلاً تنفيذياً للإنتاج."
        }
      },
      "modules": [
        { "title": "Odoo Architecture Overview", "translations": {
          "en": { "title": "Odoo Architecture Overview", "description": "Demo module: framework concepts and a reproducible development setup." },
          "ar": { "title": "نظرة عامة على بنية Odoo", "description": "محتوى تجريبي: مفاهيم إطار العمل وإعداد بيئة تطوير قابلة لإعادة التنفيذ." }
        }, "lessons": [
          {
            "title": "Introduction To Odoo Development",
            "demoConfig": { "required": true, "preview": true },
            "translations": {
              "en": {
                "title": "Introduction To Odoo Development",
                "summary": "A demo introduction to the parts of an Odoo customization and how they fit together.",
                "body": "# Demo learning content\n\nThis lesson uses a fictional service company to explain how an Odoo customization fits into a business system. It is newly authored demonstration material, not an original ETripleSoft lesson.\n\n## Start with the business need\n\nSuppose a service team needs to track maintenance contracts and prepare recurring invoices. Before writing code, describe the people, records, and decisions involved: a customer, a service contract, covered equipment, scheduled visits, and invoice lines. This keeps the implementation connected to an operational need.\n\n## Where an Odoo module fits\n\nAn addon groups related models, fields, access rules, views, menus, and supporting data. The manifest declares module metadata and dependencies. Python defines model behavior, XML describes much of the interface, and access-control files describe who may read or change records. These files work together; a visible menu alone does not grant secure access.\n\n## A practical development loop\n\n1. Write a small requirement and its acceptance example.\n2. Identify the records and relationships.\n3. Implement the smallest model and view change.\n4. Install or upgrade the addon in a disposable development database.\n5. Check expected behavior and access for each intended role.\n6. Record assumptions and repeatable setup steps.\n\nKeep experiments isolated from production data. The next demo lessons use this fictional scenario to practice setup, module structure, views, and navigation."
              },
              "ar": {
                "title": "مقدمة إلى تطوير Odoo",
                "summary": "مقدمة تجريبية إلى أجزاء تخصيص Odoo وكيفية ترابطها.",
                "body": "# محتوى تعليمي تجريبي\n\nيستخدم هذا الدرس شركة خدمات افتراضية لشرح موضع تخصيص Odoo داخل نظام الأعمال. هذه مادة توضيحية جديدة وليست درساً أصلياً من ETripleSoft.\n\n## ابدأ بحاجة العمل\n\nلنفترض أن فريق خدمات يريد متابعة عقود الصيانة وإعداد فواتير دورية. قبل كتابة الشيفرة، صف الأشخاص والسجلات والقرارات: عميل، وعقد خدمة، ومعدات مشمولة، وزيارات مجدولة، وبنود فواتير. يربط ذلك التنفيذ بحاجة تشغيلية واضحة.\n\n## دور وحدة Odoo\n\nتجمع الإضافة النماذج والحقول وقواعد الوصول وواجهات العرض والقوائم والبيانات المساندة ذات الصلة. يعلن ملف manifest بيانات الوحدة واعتمادياتها. يحدد Python سلوك النماذج، ويصف XML كثيراً من الواجهة، وتوضح ملفات التحكم في الوصول من يستطيع قراءة السجلات أو تغييرها. تعمل هذه الملفات معاً؛ فظهور قائمة لا يمنح وحده صلاحية آمنة.\n\n## دورة تطوير عملية\n\n1. اكتب متطلباً صغيراً ومثالاً يوضح قبوله.\n2. حدد السجلات والعلاقات بينها.\n3. نفذ أصغر تغيير ممكن في النموذج والواجهة.\n4. ثبّت الإضافة أو حدّثها في قاعدة تطوير مؤقتة.\n5. تحقق من السلوك والصلاحيات لكل دور مستهدف.\n6. سجل الافتراضات وخطوات الإعداد القابلة للتكرار.\n\nاعزل التجارب عن بيانات الإنتاج. تستخدم الدروس التجريبية التالية هذا السيناريو الافتراضي للتدرب على الإعداد وبنية الوحدة والعروض والتنقل."
              }
            }
          },
          {
            "title": "Configure & Install Odoo",
            "demoConfig": { "required": true, "preview": false },
            "translations": {
              "en": {
                "title": "Configure & Install Odoo",
                "summary": "A demo checklist for preparing an isolated Odoo development environment.",
                "body": "# Demo learning content\n\nThis setup checklist is illustrative and is not tied to a particular ETripleSoft deployment or supported Odoo release. Confirm the target Odoo version and installation method against the project you are actually working on.\n\n## Prepare an isolated workspace\n\nUse a disposable development environment, a dedicated database, and source control. Keep credentials and database backups out of the repository. Record the Odoo version, enabled addons, configuration file location, and commands needed to reproduce the environment.\n\n## Check the addon path\n\nPlace the custom addon in a directory included in the configured addons path. Confirm that the module folder has a valid manifest and Python package initialization files. Restart the development service after changing Python code when required by your run configuration.\n\n## Install and inspect\n\nUpdate the application list, install the demo addon, and inspect the server log for dependency or XML errors. Verify that expected models, menus, and views appear for an authorized test user. Then test a role that should not have access.\n\n## Keep the setup reproducible\n\nDocument the environment rather than relying on undocumented local state. Before testing upgrades, use disposable data and keep a recovery copy. Do not point a tutorial exercise at a production database."
              },
              "ar": {
                "title": "إعداد Odoo وتثبيته",
                "summary": "قائمة تحقق تجريبية لإعداد بيئة تطوير معزولة لـ Odoo.",
                "body": "# محتوى تعليمي تجريبي\n\nقائمة الإعداد هذه توضيحية، ولا ترتبط بنشر محدد لـ ETripleSoft أو بإصدار Odoo مدعوم بعينه. تحقق من الإصدار وطريقة التثبيت المناسبين للمشروع الذي تعمل عليه فعلياً.\n\n## جهّز مساحة عمل معزولة\n\nاستخدم بيئة تطوير مؤقتة وقاعدة بيانات مخصصة ونظاماً للتحكم في المصدر. لا تضع بيانات الاعتماد أو نسخ قواعد البيانات الاحتياطية في المستودع. سجل إصدار Odoo والإضافات المفعلة وموقع ملف الإعداد والأوامر اللازمة لإعادة إنشاء البيئة.\n\n## تحقق من مسار الإضافات\n\nضع الإضافة المخصصة في مجلد موجود ضمن مسار الإضافات المعدّ. تحقق من وجود manifest صالح وملفات تهيئة حزم Python. أعد تشغيل خدمة التطوير بعد تعديل Python إذا كان إعداد التشغيل يتطلب ذلك.\n\n## ثبّت وافحص\n\nحدّث قائمة التطبيقات وثبّت الإضافة التجريبية وافحص سجل الخادم بحثاً عن أخطاء الاعتماديات أو XML. تحقق من ظهور النماذج والقوائم والعروض المتوقعة لمستخدم اختبار مخول، ثم اختبر دوراً ينبغي ألا يملك الوصول.\n\n## اجعل الإعداد قابلاً للتكرار\n\nوثّق البيئة بدلاً من الاعتماد على حالة محلية غير مسجلة. استخدم بيانات مؤقتة واحتفظ بنسخة للاستعادة قبل اختبار التحديثات. لا توجه تمريناً تعليمياً إلى قاعدة بيانات إنتاجية."
              }
            }
          }
        ]},
        { "title": "Creating Custom Modules", "translations": {
          "en": { "title": "Creating Custom Modules", "description": "Demo module: organize an addon around a small, explicit business requirement." },
          "ar": { "title": "إنشاء وحدات مخصصة", "description": "محتوى تجريبي: تنظيم إضافة حول متطلب عمل صغير وواضح." }
        }, "lessons": [
          {
            "title": "Scaffolding your first module & Create Custom Addon",
            "demoConfig": { "required": true, "preview": false },
            "translations": {
              "en": {
                "title": "Scaffolding your first module & Create Custom Addon",
                "summary": "Build a small illustrative addon structure for the fictional service-contract scenario.",
                "body": "# Demo learning content\n\nThe goal is to understand the shape of an addon, not to claim this is a production-ready contract-management module. The example is intentionally small and uses fictional requirements.\n\n## Sketch the requirement\n\nThe fictional service team wants a contract record with a customer, a reference, a start date, an end date, and a status. A later exercise may connect a contract to service visits. Decide which fields are required and what should happen when a contract is closed before creating models.\n\n## Organize the addon\n\nA typical small addon separates its manifest, Python models, XML views, access rules, and tests into clear files. The manifest names the addon and lists dependencies. Python package initialization imports model packages. Model files define the record structure and business rules. XML files can define views and actions. Access rules must be designed for the intended roles.\n\n## Build in thin steps\n\nStart with the model and a minimal form. Add a list view and a menu only when the use case needs them. Keep references to standard Odoo models explicit and depend on the addons that provide them. Add a test for an important rule, such as preventing an end date from preceding the start date.\n\n## Review before extending\n\nInstall the addon in a disposable database, inspect upgrade behavior, and test access using different roles. A scaffold is only a starting point: meaningful validation, access control, and tests are still needed."
              },
              "ar": {
                "title": "إنشاء هيكل أول وحدة وإضافة مخصصة",
                "summary": "أنشئ هيكلاً توضيحياً صغيراً لإضافة خاصة بسيناريو عقد الخدمة الافتراضي.",
                "body": "# محتوى تعليمي تجريبي\n\nالهدف هو فهم بنية الإضافة، لا الادعاء بأن المثال وحدة جاهزة للإنتاج لإدارة العقود. المثال صغير عمداً ويستخدم متطلبات افتراضية.\n\n## صغ المتطلب\n\nيريد فريق الخدمات الافتراضي سجل عقد يتضمن عميلاً ومرجعاً وتاريخ بداية ونهاية وحالة. قد يربط تمرين لاحق العقد بزيارات الخدمة. حدد الحقول المطلوبة وما ينبغي أن يحدث عند إغلاق العقد مبكراً قبل إنشاء النماذج.\n\n## نظّم الإضافة\n\nتفصل الإضافة الصغيرة عادةً manifest والنماذج المكتوبة بـ Python وعروض XML وقواعد الوصول والاختبارات في ملفات واضحة. يعرّف manifest الإضافة واعتمادياتها. تستورد ملفات تهيئة Python حزم النماذج. تحدد ملفات النماذج بنية السجلات وقواعد العمل. ويمكن لملفات XML تعريف العروض والإجراءات. يجب تصميم قواعد الوصول للأدوار المقصودة.\n\n## نفذ على خطوات صغيرة\n\nابدأ بالنموذج ونموذج إدخال بسيط. أضف عرض قائمة وقائمة تنقل عندما تحتاجهما حالة الاستخدام. اجعل الاعتماد على نماذج Odoo القياسية واضحاً، وأضف اعتماديات الوحدات التي توفرها. أضف اختباراً لقاعدة مهمة، مثل منع تاريخ نهاية يسبق تاريخ البداية.\n\n## راجع قبل التوسعة\n\nثبّت الإضافة في قاعدة مؤقتة وافحص سلوك التحديث واختبر الوصول باستخدام أدوار مختلفة. الهيكل الأولي مجرد نقطة بداية؛ ما زالت قواعد التحقق والتحكم في الوصول والاختبارات مطلوبة."
              }
            }
          }
        ]},
        { "title": "Views and UI in Odoo", "translations": {
          "en": { "title": "Views and UI in Odoo", "description": "Demo module: present and find the fictional contract records." },
          "ar": { "title": "العروض وواجهة المستخدم في Odoo", "description": "محتوى تجريبي: عرض سجلات العقود الافتراضية والبحث فيها." }
        }, "lessons": [
          {
            "title": "Form view deep dive",
            "demoConfig": { "required": true, "preview": false },
            "translations": {
              "en": {
                "title": "Form view deep dive",
                "summary": "Use a form view to make a fictional service-contract record understandable and usable.",
                "body": "# Demo learning content\n\nA form view should help a user understand one record and complete a task. This demonstration uses a fictional service contract and does not describe a shipped ETripleSoft addon.\n\n## Group information by task\n\nPut the customer and contract reference near the top, followed by dates and status. Separate operational notes from fields used for decisions. Use labels that describe the business meaning rather than internal field names.\n\n## Make relationships clear\n\nA customer field should lead to the relevant partner record. If the example later adds service visits, show them as related records only when users need to review or create them from the contract. Avoid adding every available field to one screen.\n\n## Validate the flow\n\nTry a new record, an edited record, and a closed contract. Check required values and access permissions with the intended roles. Keep validation in the model as well as the interface when the rule protects data integrity; a view alone is not an authorization boundary.\n\n## Review the layout\n\nUse sections and helpful hints sparingly. Check keyboard order and narrow screens if the view is embedded in a responsive interface. A good form makes the next task clear without hiding the underlying business rule."
              },
              "ar": {
                "title": "استكشاف عرض النموذج",
                "summary": "استخدم عرض النموذج لتوضيح سجل عقد خدمة افتراضي وجعله قابلاً للاستخدام.",
                "body": "# محتوى تعليمي تجريبي\n\nينبغي أن يساعد عرض النموذج المستخدم على فهم سجل واحد وإنجاز مهمة. يستخدم هذا المثال عقد خدمة افتراضياً ولا يصف إضافة منشورة من ETripleSoft.\n\n## رتّب المعلومات بحسب المهمة\n\nضع العميل ومرجع العقد قرب أعلى النموذج، ثم التواريخ والحالة. افصل الملاحظات التشغيلية عن الحقول التي تؤثر في القرارات. استخدم تسميات تشرح المعنى العملي بدلاً من أسماء الحقول الداخلية.\n\n## وضّح العلاقات\n\nينبغي أن يقود حقل العميل إلى سجل جهة الاتصال المناسب. وإذا أضاف المثال زيارات خدمة لاحقاً، فاعرض السجلات المرتبطة فقط عندما يحتاج المستخدم إلى مراجعتها أو إنشائها من العقد. تجنب حشر كل الحقول الممكنة في شاشة واحدة.\n\n## تحقق من سير العمل\n\nجرّب إنشاء سجل وتعديله وعقداً مغلقاً. تحقق من القيم المطلوبة وصلاحيات الأدوار المستهدفة. ضع قواعد سلامة البيانات في النموذج أيضاً عندما يلزم؛ فالعرض وحده ليس حدّاً أمنياً للتفويض.\n\n## راجع التخطيط\n\nاستخدم الأقسام والإرشادات باعتدال. تحقق من ترتيب لوحة المفاتيح ومن الشاشات الضيقة إذا عُرض النموذج داخل واجهة متجاوبة. يوضح النموذج الجيد المهمة التالية دون إخفاء قاعدة العمل."
              }
            }
          },
          {
            "title": "List view & kanban view",
            "demoConfig": { "required": true, "preview": false },
            "translations": {
              "en": {
                "title": "List view & kanban view",
                "summary": "Compare table-like and card-based views for the demo contract workflow.",
                "body": "# Demo learning content\n\nList and kanban views answer different questions. This example uses fictional service contracts and contains no real customer information.\n\n## Use a list for comparison\n\nA list works well when people need to scan many records, sort by a date, compare status, or edit a small set of columns. Choose columns that support the task, such as reference, customer, end date, and status. Avoid showing sensitive values to roles that do not need them.\n\n## Use kanban for grouped work\n\nA kanban board can help a team review records grouped by a workflow stage, such as Draft, Active, and Closed. Keep the stage meaning explicit and ensure that moving a card performs a valid state transition. Do not use visual grouping as a substitute for server-side rules.\n\n## Choose deliberately\n\nAsk what decision the user makes in each view. If users need detailed sorting and comparison, prefer a list. If they need to understand work distribution across a few stages, a board may help. Test both with realistic record counts and role permissions."
              },
              "ar": {
                "title": "عرضا القائمة وكانبان",
                "summary": "قارن بين عرض الجدول وعرض البطاقات في سير عمل العقود التجريبي.",
                "body": "# محتوى تعليمي تجريبي\n\nيجيب عرض القائمة وعرض كانبان عن أسئلة مختلفة. يستخدم هذا المثال عقود خدمة افتراضية ولا يحتوي على بيانات عملاء حقيقية.\n\n## استخدم القائمة للمقارنة\n\nتناسب القائمة مسح سجلات كثيرة وفرزها حسب التاريخ ومقارنة حالاتها أو تعديل مجموعة صغيرة من الأعمدة. اختر الأعمدة التي تخدم المهمة، مثل المرجع والعميل وتاريخ الانتهاء والحالة. لا تعرض قيماً حساسة لأدوار لا تحتاجها.\n\n## استخدم كانبان لتجميع العمل\n\nتساعد لوحة كانبان الفريق على مراجعة السجلات المجمعة حسب مرحلة العمل، مثل مسودة ونشط ومغلق. اجعل معنى كل مرحلة واضحاً، وتأكد من أن نقل البطاقة ينفذ انتقالاً صالحاً للحالة. لا تجعل التجميع المرئي بديلاً عن قواعد الخادم.\n\n## اختر عن قصد\n\nاسأل عن القرار الذي يتخذه المستخدم في كل عرض. إذا احتاج إلى فرز تفصيلي ومقارنة، فالقائمة أنسب. وإذا احتاج إلى فهم توزيع العمل بين مراحل قليلة، فقد تفيد اللوحة. اختبر العرضين بعدد سجلات واقعي وبصلاحيات الأدوار."
              }
            }
          },
          {
            "title": "Search view, filters & group-by",
            "demoConfig": { "required": false, "preview": false },
            "translations": {
              "en": {
                "title": "Search view, filters & group-by",
                "summary": "Practice finding demo contracts with filters and useful groupings.",
                "body": "# Demo learning content\n\nSearch tools help users narrow a large list to records relevant to their task. The records in this exercise are fictional.\n\n## Begin with a question\n\nA service coordinator might ask: which active contracts end this month? Translate that question into available fields and conditions: status is Active, and the end date is within the selected month.\n\n## Combine and save filters\n\nTry filtering by customer, status, or end date. Combine conditions only when their meaning is clear. A saved filter should have a useful name and should not imply that it contains every record when access rules limit the user's view.\n\n## Group to spot patterns\n\nGrouping by status can reveal workload distribution. Grouping by customer may help review relationships, but it can make a large result harder to scan. Verify the result count and inspect a few records to ensure the filter expresses the intended business question.\n\n## Remember access boundaries\n\nSearch is a convenience, not a permission system. The server must still restrict which records each role may read."
              },
              "ar": {
                "title": "عرض البحث والتصفية والتجميع",
                "summary": "تدرّب على العثور على العقود التجريبية باستخدام عوامل التصفية والتجميع.",
                "body": "# محتوى تعليمي تجريبي\n\nتساعد أدوات البحث المستخدمين على حصر قائمة كبيرة في السجلات المرتبطة بمهمتهم. سجلات هذا التمرين افتراضية.\n\n## ابدأ بسؤال\n\nقد يسأل منسق الخدمات: ما العقود النشطة التي تنتهي هذا الشهر؟ حوّل السؤال إلى حقول وشروط متاحة: الحالة نشطة، وتاريخ الانتهاء ضمن الشهر المحدد.\n\n## اجمع عوامل التصفية واحفظها\n\nجرّب التصفية حسب العميل أو الحالة أو تاريخ الانتهاء. اجمع الشروط عندما يكون معناها واضحاً فقط. ينبغي أن يحمل عامل التصفية المحفوظ اسماً مفيداً، وألا يوحي بأنه يشمل كل السجلات إذا كانت قواعد الوصول تحد من عرض المستخدم.\n\n## اجمع لاكتشاف الأنماط\n\nقد يكشف التجميع حسب الحالة توزيع العمل. وقد يفيد التجميع حسب العميل في مراجعة العلاقات، لكنه قد يجعل النتائج الكبيرة أصعب في التصفح. تحقق من عدد النتائج وافحص بعض السجلات للتأكد من أن التصفية تجيب عن سؤال العمل المقصود.\n\n## تذكر حدود الوصول\n\nالبحث وسيلة مساعدة وليس نظام صلاحيات. يجب أن يقيّد الخادم السجلات التي يستطيع كل دور قراءتها."
              }
            }
          },
          {
            "title": "Actions & menu items",
            "demoConfig": { "required": true, "preview": false },
            "translations": {
              "en": {
                "title": "Actions & menu items",
                "summary": "Connect the fictional contract model to a clear, permission-aware navigation path.",
                "body": "# Demo learning content\n\nMenus and actions help people reach the right records and tasks. This lesson extends the fictional service-contract example and is not a production implementation recipe.\n\n## Design a short path\n\nA user should be able to open the Contracts area, review a list, and create a record when their role permits it. Choose a parent menu that matches the business area and an action that opens the intended model with the appropriate view.\n\n## Keep visibility and authorization separate\n\nA menu can be hidden for a role to reduce clutter, but hiding it does not protect the underlying records. Model access rights and record rules must enforce who can read, create, update, or delete data. Test direct routes and actions as well as the visible navigation.\n\n## Check context and defaults\n\nDefaults can speed up a common task, but they must not silently assign a wrong customer, company, or status. Review any context values and confirm they behave safely when users open the action from different screens.\n\n## Validate the result\n\nAsk a permitted test user to complete the workflow and an unpermitted role to attempt direct access. Confirm that labels are understandable and that actions do not expose records outside the user's authority."
              },
              "ar": {
                "title": "الإجراءات وعناصر القوائم",
                "summary": "اربط نموذج العقد الافتراضي بمسار تنقل واضح يراعي الصلاحيات.",
                "body": "# محتوى تعليمي تجريبي\n\nتساعد القوائم والإجراءات المستخدمين على الوصول إلى السجلات والمهام المناسبة. يوسّع هذا الدرس مثال عقد الخدمة الافتراضي، وليس وصفة تنفيذ إنتاجية.\n\n## صمّم مساراً قصيراً\n\nينبغي أن يستطيع المستخدم فتح قسم العقود ومراجعة قائمة وإنشاء سجل إذا سمح دوره بذلك. اختر قائمة رئيسية تناسب مجال العمل وإجراءً يفتح النموذج المقصود بالعرض المناسب.\n\n## افصل بين الظهور والتفويض\n\nيمكن إخفاء قائمة عن دور لتقليل الازدحام، لكن إخفاءها لا يحمي السجلات نفسها. يجب أن تنفذ صلاحيات الوصول وقواعد السجلات من يستطيع قراءة البيانات أو إنشائها أو تحديثها أو حذفها. اختبر المسارات والإجراءات المباشرة إلى جانب القوائم الظاهرة.\n\n## راجع السياق والقيم الافتراضية\n\nقد تسرّع القيم الافتراضية مهمة متكررة، لكنها يجب ألا تعيّن عميلاً أو شركة أو حالة غير صحيحة بصمت. راجع قيم السياق وتحقق من سلامتها عند فتح الإجراء من شاشات مختلفة.\n\n## تحقق من النتيجة\n\nاطلب من مستخدم اختبار مخول إكمال سير العمل، ومن دور غير مخول محاولة الوصول المباشر. تأكد من وضوح التسميات ومن أن الإجراءات لا تكشف سجلات خارج صلاحيات المستخدم."
              }
            }
          }
        ]},
        { "title": "🧾 Business Case: Automated Service Billing & Contract Management Addon", "translations": {
          "en": { "title": "🧾 Business Case: Automated Service Billing & Contract Management Addon", "description": "Fictional capstone context for practicing requirement analysis and addon design." },
          "ar": { "title": "🧾 حالة عمل: إضافة فوترة الخدمات وإدارة العقود آلياً", "description": "سياق مشروع افتراضي للتدرب على تحليل المتطلبات وتصميم الإضافة." }
        }, "lessons": [
          {
            "title": "Reference Book",
            "demoConfig": { "required": false, "preview": false },
            "translations": {
              "en": {
                "title": "Reference Book",
                "summary": "A demo case brief and design checklist for a fictional contract and service-billing addon.",
                "body": "# Demo learning content\n\nThis case brief describes a fictional company and is newly authored for interface and workflow testing. It is not a real client engagement, approved implementation, or original ETripleSoft training resource.\n\n## Scenario\n\nNorthstar Field Services maintains equipment for business customers. The team wants to record service contracts, track covered equipment, schedule visits, and prepare invoice drafts for review. A manager needs a clear view of active contracts and upcoming renewals.\n\n## Demo requirements\n\n- Store a customer, contract reference, effective dates, and lifecycle status.\n- Link covered equipment to the contract without duplicating customer records.\n- Record planned visits and their outcomes.\n- Show contract and visit information to authorized service roles.\n- Let an accounting role review invoice drafts before posting.\n- Keep a traceable link between a contract, visit, and draft invoice.\n\n## Questions before implementation\n\nClarify whether billing is fixed, usage-based, or manually approved; how cancellations affect future invoices; and which Odoo version and accounting localization apply. These are open scenario questions, not assumptions to hard-code.\n\n## Suggested design review\n\nMap each requirement to a model, field, view, access rule, and test. Identify sensitive actions and the role allowed to perform them. Define how duplicate visits and repeated invoice generation are prevented. Review the design with functional and technical stakeholders before treating it as a production specification."
              },
              "ar": {
                "title": "مرجع الحالة",
                "summary": "ملخص حالة تجريبية وقائمة تصميم لإضافة افتراضية للعقود وفوترة الخدمات.",
                "body": "# محتوى تعليمي تجريبي\n\nيصف ملخص الحالة شركة افتراضية، وقد كُتب لاختبار الواجهة وسير العمل. وهو ليس تعاقداً مع عميل حقيقي ولا تنفيذاً معتمداً ولا مورداً تدريبياً أصلياً من ETripleSoft.\n\n## السيناريو\n\nتتولى شركة نورث ستار الافتراضية للخدمات الميدانية صيانة معدات العملاء من الشركات. يريد الفريق تسجيل عقود الخدمة ومتابعة المعدات المشمولة وجدولة الزيارات وإعداد مسودات فواتير للمراجعة. ويحتاج المدير إلى رؤية واضحة للعقود النشطة وتجديداتها القادمة.\n\n## متطلبات تجريبية\n\n- حفظ العميل ومرجع العقد وتواريخ السريان وحالة دورة الحياة.\n- ربط المعدات المشمولة بالعقد دون تكرار سجلات العملاء.\n- تسجيل الزيارات المخططة ونتائجها.\n- إظهار معلومات العقود والزيارات لأدوار الخدمة المخولة.\n- إتاحة مراجعة مسودات الفواتير قبل ترحيلها لدور المحاسبة.\n- الاحتفاظ برابط يمكن تتبعه بين العقد والزيارة ومسودة الفاتورة.\n\n## أسئلة يجب حسمها قبل التنفيذ\n\nحدد ما إذا كانت الفوترة ثابتة أو حسب الاستخدام أو تتطلب موافقة يدوية، وكيف يؤثر الإلغاء في الفواتير المستقبلية، وإصدار Odoo والتوطين المحاسبي المناسبين. هذه أسئلة مفتوحة في السيناريو وليست افتراضات ينبغي تثبيتها في الشيفرة.\n\n## مراجعة التصميم المقترحة\n\nاربط كل متطلب بنموذج وحقل وعرض وقاعدة وصول واختبار. حدد الإجراءات الحساسة والدور المخول بها. صمّم منع تكرار الزيارات وإنشاء الفاتورة أكثر من مرة. راجع التصميم مع أصحاب المصلحة الوظيفيين والتقنيين قبل اعتباره مواصفة إنتاجية."
              }
            }
          }
        ]}
      ]
    },
    {
      "slug": "odoo-implementation",
      "sourceUrl": "https://etriple.odoo.com/slides/odoo-implementation-4",
      "listedDuration": "12 hours 55 minutes",
      "listedSteps": 48,
      "listedPrice": "1499.99 EGP",
      "category": null,
      "level": null,
      "modules": [
        { "title": "Accounting", "lessons": [
          { "title": "Odoo_User_Guide" }, { "title": "Implementation Cycle" }, { "title": "Intro & Dashboard", "preview": true },
          { "title": "Customers" }, { "title": "Vendors" }, { "title": "Accounting Cycle" }
        ]},
        { "title": "Crm & Sales", "lessons": [
          { "title": "Crm Cycle", "preview": true }, { "title": "Sales Cycle" }
        ]},
        { "title": "Purchase", "lessons": [
          { "title": "RFQ & Purchase Order", "preview": true }, { "title": "Purchase Agreement" }, { "title": "Vendor Bill" },
          { "title": "Purchase Order Approvals" }, { "title": "Purchase Alternatives" }, { "title": "Product & Vendor Warnings" }
        ]},
        { "title": "Inventory", "lessons": [
          { "title": "Warehouses" }, { "title": "Locations" }, { "title": "Operation Types" }, { "title": "Routes" },
          { "title": "Drop-Shipping" }, { "title": "Putaway Rules" }, { "title": "Packages" }, { "title": "Product Category" },
          { "title": "Product Template & Variants" }, { "title": "Unit Of Measure" }, { "title": "Lots & Serial Number" },
          { "title": "Lot Expiry Date" }, { "title": "Reordering Rules" }, { "title": "Landed Cost" }, { "title": "Scrap" },
          { "title": "Consignment" }, { "title": "Dashboard & Operations" }, { "title": "Batch & Wave Transfer" },
          { "title": "Inventory Adjustments" }, { "title": "Inventory Reports" }
        ]},
        { "title": "Human Resources", "lessons": [
          { "title": "Department" }, { "title": "Employee" }, { "title": "Contracts" }, { "title": "Time Off" },
          { "title": "Attendance" }, { "title": "Payroll" }, { "title": "Payslip" }, { "title": "Recruitment" }
        ]},
        { "title": "Manufacturing", "lessons": [
          { "title": "Manufacture Order" }, { "title": "Bill Of Material" }, { "title": "Operations" },
          { "title": "Work Center" }, { "title": "Mrp Planning" }
        ]},
        { "title": "Certificate", "lessons": [{ "title": "Odoo Implementation" }]}
      ]
    },
    {
      "slug": "odoo-user-guide",
      "sourceUrl": "https://etriple.odoo.com/slides/odoo-user-guide-5",
      "listedDuration": "4 hours 22 minutes",
      "listedSteps": 6,
      "listedPrice": "999.99 EGP",
      "category": null,
      "level": null,
      "modules": [
        { "title": "Modules", "lessons": [
          { "title": "User Guide" }, { "title": "Accounting" }, { "title": "CRM", "preview": true },
          { "title": "Sales" }, { "title": "Purchase" }, { "title": "Certifcation" }
        ]}
      ]
    },
    {
      "slug": "odoo-system-admin",
      "sourceUrl": "https://etriple.odoo.com/slides/odoo-system-admin-6",
      "listedDuration": "4 hours 33 minutes",
      "listedSteps": 10,
      "listedPrice": "999.99 EGP",
      "category": null,
      "level": null,
      "visibleLessons": 9,
      "notes": "The public page lists 10 steps but only exposes these 9 lesson titles in the accessible outline; the unknown title is not invented.",
      "modules": [
        { "title": "Administration", "lessons": [
          { "title": "System Admin Guide" }, { "title": "Access Rights" }, { "title": "Handle Users" },
          { "title": "Security Groups" }, { "title": "Companies" }, { "title": "Languages" },
          { "title": "Studio" }, { "title": "Backups" }, { "title": "Odoo System Admin" }
        ]}
      ]
    }
  ]
  $manifest$::jsonb;
  v_course jsonb;
  v_module jsonb;
  v_lesson jsonb;
  v_course_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  v_module_position integer;
  v_lesson_position integer;
  v_locale text;
  v_translation jsonb;
  v_expected_steps integer;
  v_expected_visible_lessons integer;
  v_actual_steps integer;
  v_uuid_hash text;
  v_published_at timestamptz := '2026-10-11 00:00:00+00'::timestamptz;
BEGIN
  FOR v_course IN SELECT value FROM jsonb_array_elements(v_manifest) LOOP
    SELECT id INTO v_course_id FROM public.courses WHERE slug = v_course->>'slug';
    IF v_course_id IS NULL THEN
      RAISE EXCEPTION 'Course fixture slug % is missing; load supabase/seed.sql first', v_course->>'slug';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.course_translations
      WHERE course_id = v_course_id AND locale = 'en' AND publication_status = 'published'
    ) THEN
      RAISE EXCEPTION 'Course fixture % needs a published English course translation', v_course->>'slug';
    END IF;

    SELECT COALESCE(sum(jsonb_array_length(modules.value->'lessons')), 0)::integer
      INTO v_actual_steps
      FROM jsonb_array_elements(v_course->'modules') AS modules(value);
    v_expected_steps := (v_course->>'listedSteps')::integer;
    v_expected_visible_lessons := COALESCE((v_course->>'visibleLessons')::integer, v_expected_steps);
    IF v_actual_steps <> v_expected_visible_lessons THEN
      RAISE EXCEPTION 'Fixture % contains % visible lessons; manifest records % visible titles (% listed steps)',
        v_course->>'slug', v_actual_steps, v_expected_visible_lessons, v_expected_steps;
    END IF;

    IF v_course ? 'contentOrigin' THEN
      IF v_course->>'contentOrigin' <> 'assistant-authored-demo'
        OR NULLIF(pg_catalog.btrim(v_course->>'fixtureOwner'), '') IS NULL
        OR NULLIF(pg_catalog.btrim(v_course->>'contentLabel'), '') IS NULL
        OR NULLIF(pg_catalog.btrim(v_course->>'demoConfiguration'), '') IS NULL THEN
        RAISE EXCEPTION 'Demo content fixture % must identify its origin, owner, label, and demo configuration',
          v_course->>'slug';
      END IF;

      IF NOT (v_course->'courseTranslations' ? 'en')
        OR NOT (v_course->'courseTranslations' ? 'ar')
        OR NULLIF(pg_catalog.btrim(v_course->'courseTranslations'->'en'->>'summary'), '') IS NULL
        OR NULLIF(pg_catalog.btrim(v_course->'courseTranslations'->'en'->>'description'), '') IS NULL
        OR NULLIF(pg_catalog.btrim(v_course->'courseTranslations'->'ar'->>'summary'), '') IS NULL
        OR NULLIF(pg_catalog.btrim(v_course->'courseTranslations'->'ar'->>'description'), '') IS NULL THEN
        RAISE EXCEPTION 'Demo content fixture % must provide labeled English and Arabic course translations',
          v_course->>'slug';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_course->'modules') AS modules(value)
        WHERE NOT (modules.value->'translations' ? 'en')
          OR NOT (modules.value->'translations' ? 'ar')
          OR NULLIF(pg_catalog.btrim(modules.value->'translations'->'en'->>'description'), '') IS NULL
          OR NULLIF(pg_catalog.btrim(modules.value->'translations'->'ar'->>'description'), '') IS NULL
      ) THEN
        RAISE EXCEPTION 'Demo content fixture % must provide English and Arabic module translations',
          v_course->>'slug';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_course->'modules') AS modules(value)
        CROSS JOIN LATERAL jsonb_array_elements(modules.value->'lessons') AS lessons(value)
        WHERE NOT (lessons.value->'translations' ? 'en')
          OR NOT (lessons.value->'translations' ? 'ar')
          OR NULLIF(pg_catalog.btrim(lessons.value->'translations'->'en'->>'summary'), '') IS NULL
          OR NULLIF(pg_catalog.btrim(lessons.value->'translations'->'en'->>'body'), '') IS NULL
          OR NULLIF(pg_catalog.btrim(lessons.value->'translations'->'ar'->>'summary'), '') IS NULL
          OR NULLIF(pg_catalog.btrim(lessons.value->'translations'->'ar'->>'body'), '') IS NULL
          OR lessons.value->'translations'->'en'->>'body' NOT LIKE '# Demo learning content%'
          OR lessons.value->'translations'->'ar'->>'body' NOT LIKE '# محتوى تعليمي تجريبي%'
          OR jsonb_typeof(lessons.value->'demoConfig'->'required') IS DISTINCT FROM 'boolean'
          OR jsonb_typeof(lessons.value->'demoConfig'->'preview') IS DISTINCT FROM 'boolean'
      ) THEN
        RAISE EXCEPTION 'Demo content fixture % must provide labeled bilingual lessons and explicit required/preview flags',
          v_course->>'slug';
      END IF;

      FOR v_locale, v_translation IN
        SELECT key, value FROM jsonb_each(v_course->'courseTranslations')
      LOOP
        INSERT INTO public.course_translations
          (course_id, locale, title, summary, description, publication_status, published_at)
        VALUES (
          v_course_id,
          v_locale,
          v_translation->>'title',
          v_translation->>'summary',
          v_translation->>'description',
          'published',
          v_published_at
        )
        ON CONFLICT (course_id, locale) DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          publication_status = 'published',
          published_at = COALESCE(public.course_translations.published_at, EXCLUDED.published_at);
      END LOOP;
    END IF;

    FOR v_module, v_module_position IN
      SELECT value, ordinality::integer
      FROM jsonb_array_elements(v_course->'modules') WITH ORDINALITY
    LOOP
      v_uuid_hash := md5('etriplesoft-learn-demo-module:' || (v_course->>'slug') || ':' || v_module_position);
      v_module_id := (substr(v_uuid_hash, 1, 8) || '-' || substr(v_uuid_hash, 9, 4) || '-' ||
        substr(v_uuid_hash, 13, 4) || '-' || substr(v_uuid_hash, 17, 4) || '-' || substr(v_uuid_hash, 21, 12))::uuid;

      INSERT INTO public.course_modules (id, course_id, position)
      VALUES (v_module_id, v_course_id, v_module_position)
      ON CONFLICT (id) DO NOTHING;

      IF NOT EXISTS (
        SELECT 1 FROM public.course_modules
        WHERE id = v_module_id AND course_id = v_course_id AND position = v_module_position
      ) THEN
        RAISE EXCEPTION 'Course module fixture identity/position conflict for % module %',
          v_course->>'slug', v_module_position;
      END IF;

      FOR v_locale, v_translation IN
        SELECT key, value
        FROM jsonb_each(COALESCE(
          v_module->'translations',
          jsonb_build_object('en', jsonb_build_object('title', v_module->>'title'))
        ))
      LOOP
        INSERT INTO public.module_translations
          (module_id, locale, title, description, publication_status, published_at)
        VALUES (
          v_module_id,
          v_locale,
          COALESCE(v_translation->>'title', v_module->>'title'),
          v_translation->>'description',
          'published',
          v_published_at
        )
        ON CONFLICT (module_id, locale) DO UPDATE SET
          title = EXCLUDED.title,
          description = COALESCE(EXCLUDED.description, public.module_translations.description),
          publication_status = 'published',
          published_at = COALESCE(public.module_translations.published_at, EXCLUDED.published_at);
      END LOOP;

      FOR v_lesson, v_lesson_position IN
        SELECT value, ordinality::integer
        FROM jsonb_array_elements(v_module->'lessons') WITH ORDINALITY
      LOOP
        v_uuid_hash := md5('etriplesoft-learn-demo-lesson:' || (v_course->>'slug') || ':' ||
          v_module_position || ':' || v_lesson_position);
        v_lesson_id := (substr(v_uuid_hash, 1, 8) || '-' || substr(v_uuid_hash, 9, 4) || '-' ||
          substr(v_uuid_hash, 13, 4) || '-' || substr(v_uuid_hash, 17, 4) || '-' || substr(v_uuid_hash, 21, 12))::uuid;

        INSERT INTO public.lessons
          (id, module_id, position, lesson_type, status, is_required, is_preview, published_at)
        VALUES (
          v_lesson_id,
          v_module_id,
          v_lesson_position,
          'article',
          'published',
          COALESCE((v_lesson->'demoConfig'->>'required')::boolean, true),
          COALESCE((v_lesson->'demoConfig'->>'preview')::boolean, (v_lesson->>'preview')::boolean, false),
          v_published_at
        )
        ON CONFLICT (id) DO UPDATE SET
          is_required = EXCLUDED.is_required,
          is_preview = EXCLUDED.is_preview;

        IF NOT EXISTS (
          SELECT 1 FROM public.lessons
          WHERE id = v_lesson_id AND module_id = v_module_id AND position = v_lesson_position
            AND lesson_type = 'article' AND status = 'published'
            AND is_required = COALESCE((v_lesson->'demoConfig'->>'required')::boolean, true)
            AND is_preview = COALESCE((v_lesson->'demoConfig'->>'preview')::boolean, (v_lesson->>'preview')::boolean, false)
        ) THEN
          RAISE EXCEPTION 'Course lesson fixture identity/position conflict for % module % lesson %',
            v_course->>'slug', v_module_position, v_lesson_position;
        END IF;

        FOR v_locale, v_translation IN
          SELECT key, value
          FROM jsonb_each(COALESCE(
            v_lesson->'translations',
            jsonb_build_object('en', jsonb_build_object('title', v_lesson->>'title'))
          ))
        LOOP
          INSERT INTO public.lesson_translations
            (lesson_id, locale, title, summary, body, publication_status, published_at)
          VALUES (
            v_lesson_id,
            v_locale,
            COALESCE(v_translation->>'title', v_lesson->>'title'),
            v_translation->>'summary',
            v_translation->>'body',
            'published',
            v_published_at
          )
          ON CONFLICT (lesson_id, locale) DO UPDATE SET
            title = EXCLUDED.title,
            summary = COALESCE(EXCLUDED.summary, public.lesson_translations.summary),
            body = COALESCE(EXCLUDED.body, public.lesson_translations.body),
            publication_status = 'published',
            published_at = COALESCE(public.lesson_translations.published_at, EXCLUDED.published_at);
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$course_curriculum_fixture$;
