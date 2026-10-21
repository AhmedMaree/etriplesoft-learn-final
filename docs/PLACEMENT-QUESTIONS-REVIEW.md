# Level check questions: review sheet

Written for instructors and Arabic reviewers. Version 2 of the "Find your level" skill check (migration `20261020145000_placement_review.sql`). These questions were drafted by the development team and have **not yet been reviewed** by an instructor or a native Arabic speaker.

## How the check works

- Learners choose one or both areas, then answer the four questions for each area they chose. Every question also has an "I'm not sure" option, which counts as wrong.
- Level per area: 0–1 correct = **Beginner**, 2–3 correct = **Intermediate**, 4 correct = **Advanced**.
- Learners who say they have never used Odoo skip the questions and start at Beginner.
- The level decides which courses are suggested first, for example Intermediate in Technical suggests Odoo System Admin.

## What to check

**Instructor**
- [ ] Each correct answer (✅) is right for current Odoo versions (17 and 18).
- [ ] Each wrong option is clearly wrong but still believable.
- [ ] In each area, the questions go from easy (1) to harder (4), and 4 correct really means "ready for the advanced course".

**Arabic reviewer**
- [ ] The Arabic reads naturally and uses the terms learners see in Odoo's Arabic interface.
- [ ] Code and English technical terms (Odoo, Python, `res.partner`) appear correctly inside Arabic sentences.

Send corrections to the development team. Published questions cannot be edited in place; corrections are released as a new version, and past results keep their original version.

## Functional: using and implementing Odoo

### Question 1

**EN:** How do you add a new business function, such as Inventory, to an Odoo database?

**AR:** كيف تضيف وظيفة عمل جديدة، مثل المخزون (Inventory)، إلى قاعدة بيانات Odoo؟

| | English | العربية |
|---|---|---|
|  | Create a new database for it | إنشاء قاعدة بيانات جديدة لها |
| ✅ | Install its app from the Apps menu | تثبيت التطبيق الخاص بها من قائمة التطبيقات (Apps) |
|  | Add a new user group only | إضافة مجموعة مستخدمين جديدة فقط |
|  | Change the website theme | تغيير قالب الموقع الإلكتروني |

### Question 2

**EN:** In the Sales app, what happens when you confirm a quotation?

**AR:** في تطبيق المبيعات (Sales)، ماذا يحدث عند تأكيد عرض السعر؟

| | English | العربية |
|---|---|---|
|  | An invoice is posted automatically | تُرحَّل فاتورة تلقائيًا |
|  | The customer is archived | تتم أرشفة العميل |
| ✅ | It becomes a sales order, and a delivery order is created for its physical products | يتحول إلى أمر بيع، ويُنشأ أمر تسليم لمنتجاته المادية |
|  | The products are removed from the catalog | تُحذف المنتجات من الكتالوج |

### Question 3

**EN:** In Odoo Accounting, what is the difference between a draft invoice and a posted invoice?

**AR:** في محاسبة Odoo، ما الفرق بين الفاتورة المسودة والفاتورة المُرحّلة؟

| | English | العربية |
|---|---|---|
|  | There is no difference | لا يوجد فرق |
|  | A draft invoice is emailed to the customer automatically | تُرسل الفاتورة المسودة إلى العميل بالبريد تلقائيًا |
|  | A posted invoice can always be deleted | يمكن دائمًا حذف الفاتورة المُرحّلة |
| ✅ | A posted invoice creates journal entries and gets its final number; a draft can still be edited | الفاتورة المُرحّلة تُنشئ قيود اليومية وتحصل على رقمها النهائي، بينما يمكن تعديل المسودة |

### Question 4

**EN:** During an Odoo implementation, what is a fit-gap analysis used for?

**AR:** أثناء تنفيذ Odoo، ما الغرض من تحليل الملاءمة والفجوات (Fit-Gap)؟

| | English | العربية |
|---|---|---|
| ✅ | Comparing business requirements with standard Odoo features to find what needs configuration or customization | مقارنة متطلبات العمل بميزات Odoo القياسية لتحديد ما يحتاج إلى إعداد أو تخصيص |
|  | Measuring server performance before go-live | قياس أداء الخادم قبل التشغيل الفعلي |
|  | Choosing the colors of the user interface | اختيار ألوان واجهة المستخدم |
|  | Importing the opening balances | استيراد الأرصدة الافتتاحية |

## Technical: developing and administering Odoo

### Question 1

**EN:** What does this Python code print?  print(len([1, 2, 3]))

**AR:** ماذا يطبع كود Python التالي؟ print(len([1, 2, 3]))

| | English | العربية |
|---|---|---|
| ✅ | 3 | 3 |
|  | 6 | 6 |
|  | [1, 2, 3] | [1, 2, 3] |
|  | An error | خطأ |

### Question 2

**EN:** Which file in an Odoo module declares its name, version and dependencies?

**AR:** أي ملف في وحدة Odoo يحدد اسمها وإصدارها واعتمادياتها؟

| | English | العربية |
|---|---|---|
|  | __init__.py | __init__.py |
| ✅ | __manifest__.py | __manifest__.py |
|  | models.py | models.py |
|  | ir.model.access.csv | ir.model.access.csv |

### Question 3

**EN:** Which base class do you inherit to create a new persistent Odoo model?

**AR:** ما الصنف الأساسي الذي ترث منه لإنشاء نموذج Odoo دائم جديد؟

| | English | العربية |
|---|---|---|
|  | models.TransientModel | models.TransientModel |
|  | http.Controller | http.Controller |
| ✅ | models.Model | models.Model |
|  | models.AbstractModel | models.AbstractModel |

### Question 4

**EN:** How do you add a field to an existing model such as res.partner without changing Odoo's source code?

**AR:** كيف تضيف حقلًا إلى نموذج موجود مثل res.partner دون تعديل الكود المصدري لـ Odoo؟

| | English | العربية |
|---|---|---|
|  | Edit the field list in Odoo's base module | تعديل قائمة الحقول في الوحدة الأساسية لـ Odoo |
|  | Add the column directly in PostgreSQL | إضافة العمود مباشرة في PostgreSQL |
|  | Copy the whole model into a new module with a new _name | نسخ النموذج كاملًا إلى وحدة جديدة باسم _name جديد |
| ✅ | In your own module, create a class with _inherit = 'res.partner' and declare the field | في وحدتك الخاصة، أنشئ صنفًا يحتوي على _inherit = 'res.partner' وعرّف الحقل |
