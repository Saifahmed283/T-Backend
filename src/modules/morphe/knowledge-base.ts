/**
 * Morphe knowledge base - TerraMorph website content for the chatbot.
 *
 * These Q&A pairs are derived from the actual website content
 * (hubs, LDIA, case studies, legal, contact).
 * The backend checks this first, before running the flow engine,
 * so knowledge questions never derail the qualification conversation.
 *
 * The retired gated lifecycle has been removed from the site; every answer here
 * uses the LDIA architecture (Locate, Design, Implement, Assure) instead.
 */
export type Lang = "en" | "ar"
export interface KnowledgeEntry {
  id: string
  triggers: string[] // keywords that trigger this answer
  en: string
  ar: string
  links?: Array<{ id: string; url: string; label: string; labelAr?: string }>
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  /* ------------------------------------------------------------------ */
  /*  Company & who we are                                              */
  /* ------------------------------------------------------------------ */

  {
    id: "about",
    triggers: [
      "about", "who", "what is terramorph", "company", "organization",
      "cairo", "egypt", "founded", "terra morph", "advisory llc",
    ],
    en: `TerraMorph Advisory LLC
Cairo-based social cause advisory.

• We shape ideas into structured, fundable cases
• Delivered through LDIA — Locate, Design, Implement, Assure
• Deliberately small: named founder, core team of six, vetted bench of associates
• Commercial Registration: CR No. 184 562 · Cairo · TIN 742-118-903`,
    ar: `شركة تيرامورف للاستشارات
شركة استشارية اجتماعية مقرها القاهرة.

• نصوغ الأفكار إلى حالات منظمة وقابلة للتمويل
• التنفيذ عبر هندسة LDIA — تحديد، تصميم، تنفيذ، تأكيد
• شركة صغيرة عن عمد: مؤسس مشارك، وفريق أساسي من ستة أفراد، ومقاعد من الشركاء المفحوصين
• السجل التجاري: 184 562 · القاهرة · الرقم الضريبي 742-118-903`,
    links: [
      { id: "about", url: "/about", label: "About TerraMorph", labelAr: "عن شركة تيرامورف" },
      { id: "team", url: "/about/team", label: "Founder & Team", labelAr: "المؤسس والفريق" },
    ],
  },

  {
    id: "method",
    triggers: [
      "method", "methodology", "ldia", "locate", "design", "implement", "assure",
      "how it works", "process", "architecture", "framework",
    ],
    en: `TerraMorph's delivery architecture: LDIA

Four layers behind every engagement:

• Locate — binding constraint + smallest force that moves the largest outcome
• Design — costed instruments with owners, sequencing, risk registers
• Implement — embedded in the client institution, monthly dashboards
• Assure — verify against baseline, publish method, transfer capability`,
    ar: `هندسة التسليم في شركة تيرامورف: هندسة LDIA

الأربع طبقات وراء كل تعاقد:

• تحديد — القيد الملزم وأصغر قوة تحرك أكبر نتيجة
• تصميم — أدوات مدفوعة التكلفة مع أصحاب وجداول زمنية وسجل مخاطر
• تنفيذ — مدمج داخل مؤسسة العميل مع لوحات معلومات شهرية
• تأكيد — التحقق من النتائج، نشر الطريقة، تسليم القدرة إلى أشخاص مدربين`,
    links: [
      { id: "ldia", url: "/method/ldia", label: "The LDIA Architecture", labelAr: "هندسة LDIA المعمارية" },
      { id: "instruments", url: "/method/instruments", label: "Instruments", labelAr: "الأدوات" },
    ],
  },

  {
    id: "ldia",
    triggers: ["ldia", "locate", "design", "implement", "assure", "four layers"],
    en: `LDIA — Locate, Design, Implement, Assure

The four layers behind every TerraMorph engagement:

• Locate — diagnose the ground, name the binding constraint
• Design — costed instruments with risk registers
• Implement — embedded delivery, monthly indicator reporting
• Assure — verified results published with method, capability transferred`,
    ar: `هندسة LDIA — تحديد، تصميم، تنفيذ، تأكيد

الأربع طبقات وراء كل تعاقد مع شركة تيرامورف:

• تحديد — تشخيص الواقع وتسمية القيد الملزم
• تصميم — أدوات مدفوعة التكلفة مع سجلات مخاطر
• تنفيذ — تسليم مدمج مع تقارير شهرية عن المؤشرات
• تأكيد — نتائج مؤكدة تُنشر مع الطريقة، ثم تُسند القدرة`,
    links: [
      { id: "ldia", url: "/method/ldia", label: "The LDIA Architecture", labelAr: "هندسة LDIA المعمارية" },
    ],
  },

  {
    id: "instruments",
    triggers: ["instrument", "tool", "diagnostic", "policy", "finance", "skills", "data", "convening", "blended finance", "land-bank", "curricula"],
    en: `TerraMorph instrument families:

• Binding-constraint diagnostic — isolates the one constraint worth moving
• Regulatory burden review — maps rule costs on firms
• Blended-finance structuring — first-loss tranches that unlock commercial capital
• Employer-validated curricula — co-signed with employers
• Investment & land-bank maps — bankable uses on a public register
• Coalition & consultation design — recorded consultation that survives a ministerial change

Every instrument can be licensed or transferred to the client.`,
    ar: `عائلات الأدوات في شركة تيرامورف:

• تشخيص القيد الملزم — يعزل القيد الوحيد الذي يستحق التحرك
• مراجعة الأعباء التنظيمية — تُظهِر التكلفة الحقيقية للقواعد على الشركات
• تنظيم التمويل المختلط — شرائح تحمل خسائر أولية تفتح رأس المال التجاري
• مناهج معتمدة من أصحاب العمل — تُوقّع مع أصحاب العمل
• خرائط الاستثمار والأراضي — استخدامات قابلة للتمويل على سجل عام
• تصميم التحالف والاستشارات — استشارة مسجّلة تبقى صالحة رغم تغيير الوزير

كل أداة يمكن ترخيصها أو تسليمها للعميل.`,
    links: [
      { id: "instruments", url: "/method/instruments", label: "Instruments", labelAr: "الأدوات" },
      { id: "licensing", url: "/method/licensing", label: "Licensing & Open Terms", labelAr: "الترخيص والشروط المفتوحة" },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  Services & audiences                                                */
  /* ------------------------------------------------------------------ */

  {
    id: "services",
    triggers: ["service", "advisory", "strategy", "policy", "transformation", "what do you do", "offer", "services"],
    en: `TerraMorph advisory services

We shape ideas into structured, fundable cases and guide them through LDIA.

Core services:
• Diagnostics
• Instrument design
• Coalition building
• Implementation support
• Verification

Audiences served: governments · development partners · business · NGOs · consultancies`,
    ar: `خدمات شركة تيرامورف الاستشارية

نصوغ الأفكار إلى حالات منظمة وقابلة للتمويل ونوجهها عبر هندسة LDIA.

الخدمات الأساسية:
• التشخيص
• تصميم الأدوات
• بناء التحالفات
• دعم التنفيذ
• التحقق

الجمهور المستهدف: الحكومات · شركاء التنمية · الأعمال · منظمات المجتمع المدني · الاستشاريون`,
    links: [
      { id: "services", url: "/for", label: "Advisory Services", labelAr: "خدمات الاستشارات" },
    ],
  },

  {
    id: "governments",
    triggers: ["government", "governorate", "ministry", "public sector", "procurement", "mandate", "public institution"],
    en: `TerraMorph for governments

We work with governorates, ministries, and public authorities in Egypt — mandate-mapped, procurement-ready, delivered inside your rules.

Stats: 21 public engagements · 9 governorates · 11 policies improved

Services:
• Investment & land-bank mapping
• Regulatory burden review
• Local economic development strategy
• Embedded delivery support`,
    ar: `شركة تيرامورف للحكومات

نعمل مع المحافظات والوزارات والسلطات العامة في مصر — عمل موثق بالتكليف، وجاهز للمشتريات، ومنفذ داخل قواعدكم.

الإحصاءات: 21 تعاقدًا عامًا · 9 محافظات · 11 سياسة محسنة

الخدمات:
• خرائط الاستثمار والأراضي
• مراجعة الأعباء التنظيمية
• استراتيجية التنمية الاقتصادية المحلية
• دعم التنفيذ المدمج`,
    links: [
      { id: "governments", url: "/hub/governments", label: "For Governments", labelAr: "للحكومات" },
    ],
  },

  {
    id: "business",
    triggers: ["business", "private sector", "enterprise", "investor", "diagnostic", "bookable", "price", "cost"],
    en: `TerraMorph for business

A price-bearing diagnostic with a bookable date — not a sales call.

• Fixed price, scoped up front
• Costed options with risk registers
• Clear decision at the end
• Reply time: within two working days
• Leverage per EGP fee: 0.7x portfolio median`,
    ar: `شركة تيرامورف للأعمال

تشخيص معلن السعر مع موعد قابل للحجز — ليس مكالمة بيع.

• سعر ثابت، ونطاق محدد سلفًا
• خيارات مدفوعة التكلفة مع سجلات مخاطر
• قرار واضح في النهاية
• وقت الرد: خلال يومي عمل
• الرافعة لكل جنيه مصري رسوم: 0.7x الوسيط في المحفظة`,
    links: [
      { id: "business", url: "/hub/business", label: "For Business", labelAr: "للأعمال" },
    ],
  },

  {
    id: "ngos",
    triggers: ["ngo", "social enterprise", "civil society", "capacity", "free", "toolkit", "open licence", "small budget"],
    en: `TerraMorph for NGOs

Open-licence tools, free toolkits, and a scaled engagement model.

• Free toolkits: LED diagnostic toolkit, mandate-note template (CC BY 4.0)
• Capacity-building partnerships — skill stays with your team
• Small-budget engagement model`,
    ar: `شركة تيرامورف لمنظمات المجتمع المدني

أدوات ترخيص مفتوح، وحزم أدوات مجانية، ونموذج تعاون مصغّر.

• حزم أدوات مجانية: حقيبة التشخيص LED، ونموذج مذكرة التفويض (رخصة CC BY 4.0)
• شراكات بناء القدرات — المهارة تبقى مع فريقك
• نموذج تعاون مصغّر للميزانيات الصغيرة`,
    links: [
      { id: "ngos", url: "/hub/ngos", label: "For NGOs", labelAr: "لمنظمات المجتمع المدني" },
    ],
  },

  {
    id: "consultancies",
    triggers: ["consultancy", "consulting", "prime", "sub-partner", "teaming", "bid", "compliance", "alliance"],
    en: `TerraMorph for consultancies

A specialist sub-partner with method, local reach, and a clean compliance file.

Certifications: ISO 37001 · ISO/IEC 27001 · ISO 9001 · CR 184 562

We bring:
• LED, policy, TVET, and investment-climate expertise
• Named CVs (not anonymised placeholders)
• Joint methodology alignment with your delivery framework`,
    ar: `شركة تيرامورف للاستشاريين

شريك متخصص من الباطن مع منهج، وانتشار محلي، وملف امتثال نظيف.

الشهادات: ISO 37001 · ISO/IEC 27001 · ISO 9001 · السجل التجاري 184 562

نجلب:
• خبرة في التنمية الاقتصادية المحلية، والسياسة، والتعليم التقني والمهني، والمناخ الاستثماري
• سير ذاتية مدرّجة (ليست أماكن مجهولة)
• تماشٍ منهجي مشترك مع إطار التسليم الخاص بكم`,
    links: [
      { id: "consultancies", url: "/hub/consultancies", label: "For Consultancies", labelAr: "للاستشاريين" },
    ],
  },

  {
    id: "partners",
    triggers: ["development partner", "donor", "funding", "investor", "funder", "framework", "ledger"],
    en: `TerraMorph for development partners

Registered, framework-eligible delivery with a full, verifiable assignment ledger.

• 58 ledger entries · 94% repeat or referred
• ISO 37001/27001/9001 certified
• Egyptian commercial registration: CR 184 562 · Tax ID: 742-118-903`,
    ar: `شركة تيرامورف لشركاء التنمية

تسليم مؤهل للإطار ومُسجّل مع سجل مهام كامل يمكن التحقق منه.

• 58 إدخالًا في السجل · 94% إعادة إحالة أو مرجعية
• معتمدة في ISO 37001/27001/9001
• السجل التجاري المصري: 184 562 · الرقم الضريبي: 742-118-903`,
    links: [
      { id: "partners", url: "/hub/development-partners", label: "Partnership Models", labelAr: "نماذج الشراكة" },
    ],
  },

  {
    id: "careers",
    triggers: ["career", "job", "work with us", "join", "expert", "expert network", "vacancy", "roles"],
    en: `TerraMorph careers

We name our people — every role lists a salary band, and you interview with the people you would actually work with.

Open roles:
• Senior policy analyst
• LED field coordinator
• GIS data analyst
• Learning associate

Internships: AAST (paid, mentored)
Expert network: register once, matched to live assignments`,
    ar: `الوظائف في شركة تيرامورف

نسمّي أفرادنا — كل وظيفة تدرج نطاقًا راتبيًا، وتجري مقابلتك مع الأشخاص الذين ستعمل معهم بالفعل.

الوظائف المفتوحة:
• محلل سياسات أول
• منسق ميداني للتنمية الاقتصادية المحلية
• محلل بيانات GIS
• متعلم داعم

التدريبات: مع الأكاديمية العربية (مدفوعة، مع مرشد)
شبكة الخبراء: سجّل مرة واحدة، وتُطابق مع المهام الحية`,
    links: [
      { id: "careers", url: "/join/careers", label: "Careers & Vacancies", labelAr: "الوظائف والشواغر" },
      { id: "experts", url: "/join/experts", label: "Expert Network", labelAr: "شبكة الخبراء" },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  Evidence & impact                                                   */
  /* ------------------------------------------------------------------ */

  {
    id: "cases",
    triggers: ["case study", "evidence", "impact", "assiut", "result", "verified", "outcome", "example"],
    en: `TerraMorph case studies

Written to be checked — every number is verifiable.

• Governorate investment map: EGP 1.2bn into 3 industrial zones, 46 bankable uses
• 14 technical schools re-tooled: graduation-to-job 21% → 48% within 90 days
• Blended finance for women-led agri cooperative: unlocked matching commercial facility
• Impact Report 2026: EGP 1.9bn capital catalysed, 4,100 people trained, 11 policies improved`,
    ar: `دراسات حالة شركة تيرامورف

مكتوبة للتحقق منها — كل رقم قابل للتحقق.

• خريطة استثمار محافظة: 1.2 مليار جنيه إلى 3 مناطق صناعية، 46 استخدامًا قابلًا للتمويل
• تأهيل 14 مدرسة فنية: ارتفاع التخرج إلى وظيفة من 21% إلى 48% خلال 90 يومًا
• تمويل مختلط لتعاونية زراعية تقودها نساء: فتح منشأة تجارية مطابقة
• تقرير الأثر 2026: 1.9 مليار جنيه رأس مال محفز، و4,100 شخص تم تدريبهم، و11 سياسة محسنة`,
    links: [
      { id: "case-studies", url: "/evidence/case-studies", label: "Case Studies", labelAr: "دراسات الحالة" },
      { id: "impact-report", url: "/evidence/impact-report", label: "Impact Report 2026", labelAr: "تقرير الأثر 2026" },
    ],
  },

  {
    id: "certifications",
    triggers: ["certification", "iso", "compliance", "certificate", "anti-bribery", "security", "quality", "registered"],
    en: `Certifications & compliance

• ISO 37001:2022 — anti-bribery management
• ISO/IEC 27001:2022 — information security
• ISO 9001:2015 — quality management
• Commercial Registration: CR No. 184 562 · Cairo
• Tax ID: TIN 742-118-903

Verified certificate copies released to procurement teams within one working day.`,
    ar: `الشهادات والامتثال

• ISO 37001:2022 — نظام إدارة مكافحة الرشوة
• ISO/IEC 27001:2022 — أمن المعلومات
• ISO 9001:2015 — إدارة الجودة
• السجل التجاري: 184 562 · القاهرة
• الرقم الضريبي: 742-118-903

تُصدر نسخ معتمدة من الشهادات لفرق المشتريات خلال يوم عمل واحد.`,
    links: [
      { id: "certifications", url: "/evidence/certifications", label: "Certifications", labelAr: "الشهادات" },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  Contact & offices                                                   */
  /* ------------------------------------------------------------------ */

  {
    id: "contact",
    triggers: ["contact", "reach", "email", "phone", "team", "where", "office", "cairo", "assiut", "alexandria"],
    en: `Contact TerraMorph

New Cairo head office (Sun–Thu, 09:00–17:00 EET)
Field presences: Assiut (Upper Egypt) · Alexandria (Delta)

Email:
• info@askterramorph.com — general info, news & events

Owner: mbaraka@askterramorph.com

Phone: +20 115 000 0984

Replies within one working day from a named person.`,
    ar: `تواصل مع شركة تيرامورف

المكتب الرئيسي في القاهرة الجديدة (الأحد–الخميس، 09:00–17:00 بتوقيت القاهرة)
تواجد ميداني: أسيوط (صعيد مصر) · الإسكندرية (الدلتا)

البريد الإلكتروني:
• info@askterramorph.com — المعلومات العامة، الأخبار والأحداث

المالك: mbaraka@askterramorph.com

الهاتف: +20 115 000 0984

الرد خلال يوم عمل واحد من شخص محدد الاسم.`,
    links: [
      { id: "contact", url: "/about/contact", label: "Contact & Offices", labelAr: "التواصل والمكاتب" },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  Legal & compliance                                                  */
  /* ------------------------------------------------------------------ */

  {
    id: "privacy",
    triggers: ["privacy", "data protection", "pdpl", "gdpr", "personal data", "my data", "controller"],
    en: `Privacy — TerraMorph Advisory LLC

Data controller under Egypt PDPL No. 151 of 2020 (GDPR-aligned).

Data processed with lawful basis:
• Identity data
• Engagement data
• Technical data
• Cookie data
• Marketing data (explicit opt-in only)

Retention:
• Engagement records: 10 years
• Correspondence: 7 years

Your rights: access · rectification · deletion — respond within 30 days

Contact: info@askterramorph.com`,
    ar: `الخصوصية — شركة تيرامورف للاستشارات

المتحكم في البيانات بموجب قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020 (مناسب لـ GDPR).

البيانات المُعالجة بناءً على أساس قانوني:
• بيانات الهوية
• بيانات التعاقد
• البيانات التقنية
• بيانات ملفات تعريف الارتباط
• بيانات التسويق (بموافقة صريحة فقط)

الفترة المحددة للاحتفاظ:
• سجلات التعاقدات: 10 سنوات
• المراسلات: 7 سنوات

حقوقك: الوصول · التصحيح · الحذف — الرد خلال 30 يومًا

للاتصال: info@askterramorph.com`,
    links: [
      { id: "privacy", url: "/legal/privacy-policy", label: "Privacy Policy", labelAr: "سياسة الخصوصية" },
      { id: "data-request", url: "/data-request", label: "Data Request", labelAr: "طلب بيانات" },
    ],
  },

  {
    id: "data-request",
    triggers: ["data request", "access", "rectification", "deletion", "erasure", "dsar", "rights"],
    en: `Data subject rights

Request via the Data Request page:
• Access to your personal data
• Rectification
• Restriction
• Portability
• Objection
• Erasure

We verify your identity and respond within 30 days under Egypt PDPL and GDPR-aligned standards.`,
    ar: `حقوق أصحاب البيانات

اطلب عبر صفحة طلب البيانات:
• الوصول إلى بياناتك الشخصية
• التصحيح
• التقييد
• النقل
• الاعتراض
• الحذف

نتحقق من هويتنا ونرد خلال 30 يومًا بموجب قانون حماية البيانات الشخصية المصري ومعايير مناسِبة لـ GDPR.`,
    links: [
      { id: "data-request", url: "/data-request", label: "Data Request", labelAr: "طلب بيانات" },
      { id: "privacy", url: "/legal/privacy-policy", label: "Privacy Policy", labelAr: "سياسة الخصوصية" },
    ],
  },

  {
    id: "cookies",
    triggers: ["cookie", "consent", "tracking", "analytics", "essential", "tm_session"],
    en: `Cookies

Essential cookies (no consent needed):
• tm_session — authentication
• csrf_token — CSRF protection
• cookie_consent — your consent choices

Analytics & marketing cookies require your explicit opt-in and are blocked until consent is given.

Manage preferences via the cookie banner or Cookie Policy page.`,
    ar: `ملفات تعريف الارتباط

ملفات تعريف الارتباط الأساسية (بدون موافقة):
• tm_session — المصادقة
• csrf_token — حماية CSRF
• cookie_consent — تفضيلات موافقتك

ملفات تعريف الارتباط التحليلية والتسويقية تتطلب موافقتك الصريحة وتُحظر حتى تُعطى الموافقة.

إدارة التفضيلات عبر شريط ملفات تعريف الارتباط أو صفحة سياسة ملفات تعريف الارتباط.`,
    links: [
      { id: "cookie-policy", url: "/legal/cookie-policy", label: "Cookie Policy", labelAr: "سياسة ملفات تعريف الارتباط" },
    ],
  },

  {
    id: "marketing",
    triggers: ["newsletter", "marketing", "unsubscribe", "opt-in", "email list", "subscribe"],
    en: `Marketing

We only send emails with your explicit opt-in.

Granular lists:
• Newsletter
• Events
• Insights
• Careers

Every email includes a one-click unsubscribe link (RFC 8058 List-Unsubscribe).

You can manage or withdraw consent at any time.`,
    ar: `التسويق

نرسل رسائل بريد إلكتروني فقط بموافقتك الصريحة.

القوائم المفصلة:
• النشرة الإخبارية
• الأحداث
• الرؤى
• الوظائف

كل بريد إلكتروني يتضمن رابط إلغاء اشتراك بنقرة واحدة (RFC 8058).

يمكنك إدارة أو سحب الموافقة في أي وقت.`,
    links: [
      { id: "unsubscribe", url: "/unsubscribe", label: "Unsubscribe", labelAr: "إلغاء الاشتراك" },
      { id: "newsletter", url: "/join/newsletter", label: "Newsletter", labelAr: "النشرة الإخبارية" },
    ],
  },

  {
    id: "terms",
    triggers: ["terms", "terms of service", "agreement", "engagement", "fee", "payment", "liability", "confidentiality"],
    en: `Terms of Service

Governs use of askterramorph.com, the client portal, and advisory services.

• Scope, deliverables, timeline, and fees defined in each Engagement Letter
• Confidentiality: 3 years from disclosure
• TerraMorph IP remains our property
• Clients receive a perpetual, non-exclusive licence to use deliverables internally`,
    ar: `شروط الخدمة

ت تحكم استخدام askterramorph.com، وبوابة العميل، وخدمات الاستشارات.

• النطاق والمخرجات والجدول الزمني والرسوم تُحدّد في كل خطاب تعاقد
• السرية: 3 سنوات من الإفصاح
• ملكية شركة تيرامورف الفكرية تظل ملكًا لنا
• العملاء يحصلون على ترخيص دائم غير حصري لاستخدام المخرجات داخليًا`,
    links: [
      { id: "terms", url: "/legal/terms-of-service", label: "Terms of Service", labelAr: "شروط الخدمة" },
    ],
  },

  {
    id: "refund",
    triggers: ["refund", "cancellation", "cancel", "money back", "auto-renew", "hidden fee"],
    en: `Refunds & cancellation

• Service-type-specific refund rules apply
• Cancel your subscription with one click
• No hidden fees
• Auto-renewal disclosed 30 days in advance`,
    ar: `الإلغاء والاسترداد

• قواعد استرداد خاصة بنوع الخدمة تُطبّق
• إلغاء اشتراكك بنقرة واحدة
• بدون رسوم مخفية
• الكشف عن التجديد التلقائي قبل 30 يومًا`,
    links: [
      { id: "terms", url: "/legal/terms-of-service", label: "Terms of Service", labelAr: "شروط الخدمة" },
    ],
  },

  {
    id: "dmca",
    triggers: ["dmca", "copyright", "takedown", "infringement", "copyright agent"],
    en: `DMCA

Designated copyright agent: copyright@askterramorph.com

We respond to valid takedown notices per applicable law.

TerraMorph is not a US entity but respects copyright.`,
    ar: `سياسة DMCA

وكيل حقوق الطبع والنشر المعين: copyright@askterramorph.com

نرد على إشعارات الإزالة الصالحة بموجب القانون المعمول به.

شركة تيرامورف ليست كيانًا أمريكيًا لكنها تحترم حقوق الطبع والنشر.`,
    links: [
      { id: "dmca", url: "/legal/dmca-policy", label: "DMCA Policy", labelAr: "سياسة DMCA" },
    ],
  },

  {
    id: "sub-processors",
    triggers: ["sub-processor", "subprocessor", "third party", "sdk", "analytics", "vendor"],
    en: `Sub-processors

TerraMorph uses sub-processors for:
• Session authentication (tm_session cookie)
• CSRF protection
• Optional analytics & marketing (only after consent)

Full list: /legal/sub-processors

No AI training on your data — messages are processed to answer you and are not used for model training.`,
    ar: `المعالجون الفرعيون

تستخدم شركة تيرامورف معالجين فرعيين لـ:
• المصادقة على الجلسة (ملف تعريف ارتباط tm_session)
• حماية CSRF
• التحليلات والتسويق الاختياري (فقط بعد الموافقة)

القائمة الكاملة: /legal/sub-processors

لا تدريب للذكاء الاصطناعي على بياناتك — تُعالج الرسائل للرد عليك ولا تُستخدم لتدريب النماذج.`,
    links: [
      { id: "sub-processors", url: "/legal/sub-processors", label: "Sub-processors", labelAr: "المعالجون الفرعيون" },
    ],
  },

  {
    id: "greeting",
    triggers: ["hi", "hello", "hey", "morphe", "assistant", "help", "start", "begin"],
    en: `Hello! I'm Morphe

TerraMorph's AI intake assistant — here to help you understand:

• Our advisory services
• LDIA delivery architecture
• Our work for governments, business, NGOs, development partners
• Case studies & certifications
• Careers & expert network
• Getting in touch with the team

What brings you here today?`,
    ar: `مرحبًا! أنا مورفي

المساعد الذكي لاستقبال العملاء في شركة تيرامورف — هنا لمساعدتك في فهم:

• خدماتنا الاستشارية
• هندسة LDIA للتسليم
• عملنا للحكومات، والأعمال، ومنظمات المجتمع المدني، وشركاء التنمية
• دراسات الحالة والشهادات
• الوظائف وشبكة الخبراء
• التواصل مع الفريق

ماذا يجلبك اليوم؟`,
    links: [
      { id: "services", url: "/for", label: "Services", labelAr: "الخدمات" },
      { id: "ldia", url: "/method/ldia", label: "LDIA Architecture", labelAr: "هندسة LDIA" },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  Learning & courses                                                  */
  /* ------------------------------------------------------------------ */

  {
    id: "learning",
    triggers: ["course", "training", "learning", "certification", "trainer", "academy", "programme", "class"],
    en: `TerraMorph learning programmes

Practitioner courses:
• Local Economic Development — 3 days · EGP 9,500
• Train-the-Trainer certification — 5 days · EGP 18,000
• Tailored Diagnostics for Public Institutions — 4×2h online · EGP 4,200
• Welcome Method for NGOs — free, self-paced

Open programmes: Cairo · Alexandria · online
Certified trainers listed on a public register`,
    ar: `برامج التعلّم في شركة تيرامورف

برامج للممارسين:
• التنمية الاقتصادية المحلية — 3 أيام · 9,500 جنيه مصري
• تدريب المدربين (شهادة) — 5 أيام · 18,000 جنيه مصري
• التشخيص المصمم للمؤسسات العامة — 4×2 ساعة عبر الإنترنت · 4,200 جنيه مصري
• طريقة الترحيب لمنظمات المجتمع المدني — مجاني، ذاتي الوتيرة

البرامج المفتوحة: القاهرة · الإسكندرية · عبر الإنترنت
المدربون المعتمدون مدرجون في سجل عام`,
    links: [
      { id: "catalogue", url: "/learning/catalogue", label: "Course Catalogue", labelAr: "دليل الدورات" },
      { id: "calendar", url: "/learning/calendar", label: "Programmes Calendar", labelAr: "تقويم البرامج" },
    ],
  },
]

export function findKnowledgeAnswer(text: string, lang: Lang): KnowledgeEntry | null {
  const lower = text.toLowerCase()
  let best: KnowledgeEntry | null = null
  let bestScore = 0

  for (const entry of KNOWLEDGE_BASE) {
    // Count trigger hits, with extra weight for the first (primary) trigger
    let hits = 0
    for (const t of entry.triggers) {
      if (lower.includes(t.toLowerCase())) {
        hits += entry.triggers[0] === t ? 2 : 1
      }
    }
    if (hits > bestScore) {
      bestScore = hits
      best = entry
    }
  }

  return bestScore > 0 ? best : null
}
