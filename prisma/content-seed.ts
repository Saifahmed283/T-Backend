import type { Prisma, PrismaClient } from '../src/generated/prisma/client.js'

/*
 * Public-site content seed.
 *
 * The marketing site ships static copy as its fallback, but the CMS is the
 * source of truth once it is seeded. This file is deliberately self-contained:
 * T-Backend is a separate repository from T-Frontend, so it cannot import the
 * frontend's TypeScript content at runtime. Keep the two in step by hand when
 * the site copy changes.
 *
 * Every row is seeded as PUBLISHED with a real publishedAt so the public API
 * (`/api/v1/public/content/:collectionId`) can serve it immediately.
 */

type Localized = { en: string; ar: string }

type SeedItem = {
  slug: string
  title: Localized
  data: Record<string, unknown>
  publishedAt: string
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

const assignments: SeedItem[] = [
  {
    slug: 'blended-finance-women-led-agri-cooperative',
    title: {
      en: 'Blended-finance structure, women-led agri cooperative',
      ar: 'هيكل تمويل مختلط لتعاونية زراعية تقودها نساء',
    },
    publishedAt: daysAgo(8),
    data: {
      title: {
        en: 'Blended-finance structure, women-led agri cooperative',
        ar: 'هيكل تمويل مختلط لتعاونية زراعية تقودها نساء',
      },
      client: 'Delta Impact Fund',
      clientAr: 'صندوق أثر الدلتا',
      clientType: 'NGOs',
      sector: 'Social enterprise',
      sectorAr: 'المشروعات الاجتماعية',
      geography: 'Egypt',
      geographyAr: 'مصر',
      year: 2026,
      size: '< USD 100k',
      domain: 'Finance',
      description: 'A first-loss tranche that unlocked a matching commercial facility for a women-led agri-processing cooperative.',
    },
  },
  {
    slug: 'investment-climate-action-plan',
    title: { en: 'Investment climate action plan', ar: 'خطة عمل مناخ الاستثمار' },
    publishedAt: daysAgo(22),
    data: {
      title: { en: 'Investment climate action plan', ar: 'خطة عمل مناخ الاستثمار' },
      client: 'Ministry of Planning',
      clientAr: 'وزارة التخطيط',
      clientType: 'Public sector',
      sector: 'Investment climate',
      sectorAr: 'مناخ الاستثمار',
      geography: 'Egypt',
      geographyAr: 'مصر',
      year: 2026,
      size: 'USD 250–500k',
      domain: 'Policy',
      description: 'A costed, sequenced action plan with owners inside the ministry and a published baseline.',
    },
  },
  {
    slug: 'governorate-investment-map',
    title: { en: 'Governorate investment map, phase I–II', ar: 'الخريطة الاستثمارية للمحافظة، المرحلة الأولى–الثانية' },
    publishedAt: daysAgo(45),
    data: {
      title: {
        en: 'Governorate investment map, phase I–II',
        ar: 'الخريطة الاستثمارية للمحافظة، المرحلة الأولى–الثانية',
      },
      client: 'Assiut Governorate',
      clientAr: 'محافظة أسيوط',
      clientType: 'Public sector',
      sector: 'Local economic development',
      sectorAr: 'التنمية الاقتصادية المحلية',
      geography: 'Egypt',
      geographyAr: 'مصر',
      year: 2025,
      size: 'USD 100–250k',
      domain: 'LED',
      description: 'A public register of sites and assets that moved EGP 1.2bn into three industrial zones.',
    },
  },
  {
    slug: 'main-street-led-pilot-design',
    title: { en: 'Main-street LED pilot design', ar: 'تصميم مشروع تجريبي للتنمية الاقتصادية المحلية بالشارع الرئيسي' },
    publishedAt: daysAgo(70),
    data: {
      title: {
        en: 'Main-street LED pilot design',
        ar: 'تصميم مشروع تجريبي للتنمية الاقتصادية المحلية بالشارع الرئيسي',
      },
      client: 'Municipal authority',
      clientAr: 'سلطة محلية',
      clientType: 'Public sector',
      sector: 'Local economic development',
      sectorAr: 'التنمية الاقتصادية المحلية',
      geography: 'Egypt',
      geographyAr: 'مصر',
      year: 2025,
      size: '< USD 100k',
      domain: 'LED',
      description: 'A place-based pilot scoped to one street, with a costed entry plan and an exit checklist.',
    },
  },
  {
    slug: 'employer-validated-curricula-14-schools',
    title: {
      en: 'Employer-validated curricula for 14 schools',
      ar: 'مناهج معتمدة من أصحاب العمل لـ14 مدرسة',
    },
    publishedAt: daysAgo(110),
    data: {
      title: {
        en: 'Employer-validated curricula for 14 schools',
        ar: 'مناهج معتمدة من أصحاب العمل لـ14 مدرسة',
      },
      client: 'GIZ programme',
      clientAr: 'برنامج GIZ',
      clientType: 'Development partners',
      sector: 'TVET & skills',
      sectorAr: 'التعليم الفني والمهارات',
      geography: 'Egypt',
      geographyAr: 'مصر',
      year: 2024,
      size: 'USD 100–250k',
      domain: 'Skills',
      description: 'Fourteen technical schools re-tooled around curricula validated by the employers who hire their graduates.',
    },
  },
  {
    slug: 'sme-regulatory-burden-review',
    title: { en: 'SME regulatory burden review', ar: 'مراجعة العبء التنظيمي على المشروعات الصغيرة والمتوسطة' },
    publishedAt: daysAgo(150),
    data: {
      title: {
        en: 'SME regulatory burden review',
        ar: 'مراجعة العبء التنظيمي على المشروعات الصغيرة والمتوسطة',
      },
      client: 'Chamber of commerce',
      clientAr: 'غرفة تجارية',
      clientType: 'Business',
      sector: 'Policy',
      sectorAr: 'السياسات',
      geography: 'Jordan',
      geographyAr: 'الأردن',
      year: 2024,
      size: '< USD 100k',
      domain: 'Policy',
      description: 'The real cost of rules on firms, with removals ranked by effect per unit of effort.',
    },
  },
  {
    slug: 'train-the-trainer-certification-framework',
    title: { en: 'Train-the-trainer certification framework', ar: 'إطار اعتماد تدريب المدربين' },
    publishedAt: daysAgo(200),
    data: {
      title: {
        en: 'Train-the-trainer certification framework',
        ar: 'إطار اعتماد تدريب المدربين',
      },
      client: 'AAST Academy',
      clientAr: 'أكاديمية AAST',
      clientType: 'Learning',
      sector: 'TVET & skills',
      sectorAr: 'التعليم الفني والمهارات',
      geography: 'Egypt',
      geographyAr: 'مصر',
      year: 2023,
      size: '< USD 100k',
      domain: 'Skills',
      description: 'A certification route with supervised delivery and a public register of certified trainers.',
    },
  },
  {
    slug: 'regional-logistics-corridor-pre-feasibility',
    title: { en: 'Regional logistics corridor pre-feasibility', ar: 'دراسة الجدوى الأولية لممر لوجستي إقليمي' },
    publishedAt: daysAgo(240),
    data: {
      title: {
        en: 'Regional logistics corridor pre-feasibility',
        ar: 'دراسة الجدوى الأولية لممر لوجستي إقليمي',
      },
      client: 'Development partner',
      clientAr: 'شريك تنموي',
      clientType: 'Development partners',
      sector: 'Infrastructure',
      sectorAr: 'البنية التحتية',
      geography: 'Morocco',
      geographyAr: 'المغرب',
      year: 2023,
      size: 'USD 100–250k',
      domain: 'Infrastructure',
      description: 'Demand, cost and sequencing evidence for a corridor, with assumptions exposed for challenge.',
    },
  },
]

const cases: SeedItem[] = [
  {
    slug: 'governorate-investment-map-case',
    title: {
      en: 'A governorate investment map that moved EGP 1.2bn into three industrial zones',
      ar: 'خريطة استثمارية لمحافظة نقلت 1.2 مليار جنيه إلى ثلاث مناطق صناعية',
    },
    publishedAt: daysAgo(12),
    data: {
      title: {
        en: 'A governorate investment map that moved EGP 1.2bn into three industrial zones',
        ar: 'خريطة استثمارية لمحافظة نقلت 1.2 مليار جنيه إلى ثلاث مناطق صناعية',
      },
      client: 'Governorate authority · Upper Egypt',
      sector: 'Local economic development',
      sectorAr: 'التنمية الاقتصادية المحلية',
      year: 2025,
      tag: 'Public sector',
      tagAr: 'القطاع العام',
      mandate: {
        en: 'Place bankable uses on a public register of sites and assets, inside the governorate’s own procurement rules.',
        ar: 'وضع استخدامات قابلة للتمويل على سجل عام للمواقع والأصول، داخل قواعد المشتريات الخاصة بالمحافظة.',
      },
      constraint: {
        en: 'Investment was arriving where services were weakest, not where infrastructure already existed.',
        ar: 'كان الاستثمار يصل حيث الخدمات أضعف، لا حيث توجد البنية التحتية بالفعل.',
      },
      whatWeDid: {
        en: 'Built the land-bank register with the authority’s planners, ranked sites by readiness, and costed three industrial zones.',
        ar: 'بنينا سجل بنك الأرض مع مخططي المحافظة، ورتّبنا المواقع بحسب الجاهزية، وقدّرنا تكاليف ثلاث مناطق صناعية.',
      },
      whatChanged: {
        en: 'EGP 1.2bn of committed investment landed in three industrial zones within eighteen months.',
        ar: 'وصل استثمار ملتزم بقيمة 1.2 مليار جنيه إلى ثلاث مناطق صناعية خلال ثمانية عشر شهراً.',
      },
      measurement: {
        en: 'Verified against signed investor commitments and the governorate’s published land allocations.',
        ar: 'تم التحقق منها مقابل التزامات المستثمرين الموقعة وتخصيصات الأراضي المنشورة للمحافظة.',
      },
    },
  },
  {
    slug: 'tvet-curricula-case',
    title: {
      en: 'Re-tooling 14 technical schools around employer-validated curricula',
      ar: 'تأهيل 14 مدرسة فنية وفق مناهج معتمدة من أصحاب العمل',
    },
    publishedAt: daysAgo(28),
    data: {
      title: {
        en: 'Re-tooling 14 technical schools around employer-validated curricula',
        ar: 'تأهيل 14 مدرسة فنية وفق مناهج معتمدة من أصحاب العمل',
      },
      client: 'Development partner programme',
      sector: 'TVET reform',
      sectorAr: 'إصلاح التعليم الفني',
      year: 2024,
      tag: 'Development partners',
      tagAr: 'شركاء التنمية',
      mandate: {
        en: 'Make curricula answer to the employers who hire graduates, not to the timetable that already exists.',
        ar: 'جعل المناهج تستجيب لأصحاب العمل الذين يوظفون الخريجين، لا للجدول الزمني القائم.',
      },
      constraint: {
        en: 'Employers would not commit to graduates whose training they had never seen.',
        ar: 'لم يكن أصحاب العمل يلتزمون بخريجين لم يروا تدريبهم قط.',
      },
      whatWeDid: {
        en: 'Ran employer validation panels, rebuilt fourteen curricula and certified trainers against the new modules.',
        ar: 'أدرنا لجان تحقق من أصحاب العمل، وأعدنا بناء أربعة عشر منهجاً، واعتمدنا مدربين على الوحدات الجديدة.',
      },
      whatChanged: {
        en: 'Graduation-into-job within 90 days rose from 21% to 48%.',
        ar: 'ارتفع التوظيف خلال 90 يوماً من التخرج من 21% إلى 48%.',
      },
      measurement: {
        en: 'Measured against a baseline cohort, with employer confirmation for every placement counted.',
        ar: 'قيس مقابل مجموعة أساس، مع تأكيد صاحب العمل لكل تعيين محتسب.',
      },
    },
  },
  {
    slug: 'blended-finance-case',
    title: {
      en: 'Blended-finance structure for a women-led agri-processing cooperative',
      ar: 'هيكل تمويل مختلط لتعاونية زراعية تقودها نساء',
    },
    publishedAt: daysAgo(6),
    data: {
      title: {
        en: 'Blended-finance structure for a women-led agri-processing cooperative',
        ar: 'هيكل تمويل مختلط لتعاونية زراعية تقودها نساء',
      },
      client: 'Impact fund · Delta region',
      sector: 'Social enterprise',
      sectorAr: 'المشروعات الاجتماعية',
      year: 2026,
      tag: 'NGOs',
      tagAr: 'المنظمات غير الحكومية',
      mandate: {
        en: 'Make a cooperative investable without turning it into a different organisation.',
        ar: 'جعل التعاونية قابلة للاستثمار دون تحويلها إلى منظمة مختلفة.',
      },
      constraint: {
        en: 'The cooperative had collateral for none of the commercial facility it needed.',
        ar: 'لم يكن لدى التعاونية ضمانات لأي من التسهيلات التجارية التي تحتاجها.',
      },
      whatWeDid: {
        en: 'Designed a first-loss tranche, negotiated the matching facility, and wrote the governance terms.',
        ar: 'صممنا شريحة أولى لتحمل الخسارة، وتفاوضنا على التسهيل المطابق، وكتبنا شروط الحوكمة.',
      },
      whatChanged: {
        en: 'The cooperative closed a matching commercial facility and kept its board.',
        ar: 'أغلقت التعاونية تسهيلاً تجارياً مطابقاً واحتفظت بمجلس إدارتها.',
      },
      measurement: {
        en: 'Verified against executed facility documents and board minutes.',
        ar: 'تم التحقق منها مقابل وثائق التسهيل المنفذة ومحاضر مجلس الإدارة.',
      },
    },
  },
]

const publications: SeedItem[] = [
  {
    slug: 'governorate-investment-climate-reform',
    title: {
      en: 'Investment climate reform at the governorate level',
      ar: 'إصلاح مناخ الاستثمار على مستوى المحافظات',
    },
    publishedAt: daysAgo(35),
    data: {
      title: {
        en: 'Investment climate reform at the governorate level',
        ar: 'إصلاح مناخ الاستثمار على مستوى المحافظات',
      },
      contentType: 'Policy brief',
      contentTypeAr: 'موجز سياسات',
      language: 'AR',
      meta: 'Sep 2026 · 9 min',
      metaAr: 'سبتمبر 2026 · 9 د',
      free: 'true',
      publicationDate: '2026-09-15',
      domain: 'Policy',
      license: 'CC BY 4.0',
      description: 'What a governorate can change without waiting for national legislation.',
    },
  },
  {
    slug: 'leverage-ratios-tvet-partnerships',
    title: { en: 'Leverage ratios in public–private TVET partnerships', ar: 'نسب الرافعة في شراكات التعليم الفني بين القطاعين العام والخاص' },
    publishedAt: daysAgo(60),
    data: {
      title: {
        en: 'Leverage ratios in public–private TVET partnerships',
        ar: 'نسب الرافعة في شراكات التعليم الفني بين القطاعين العام والخاص',
      },
      contentType: 'Working paper',
      contentTypeAr: 'ورقة عمل',
      language: 'EN',
      meta: 'Aug 2026 · 24 min',
      metaAr: 'أغسطس 2026 · 24 د',
      free: 'false',
      publicationDate: '2026-08-10',
      domain: 'Skills',
      description: 'A working paper on what public money actually leverages in employer-led skills partnerships.',
    },
  },
  {
    slug: 'mandate-note-survives-reshuffle',
    title: { en: 'Writing a mandate note that survives a ministerial reshuffle', ar: 'كيف تكتب مذكرة تفويض تصمد أمام تغيير وزاري' },
    publishedAt: daysAgo(85),
    data: {
      title: {
        en: 'Writing a mandate note that survives a ministerial reshuffle',
        ar: 'كيف تكتب مذكرة تفويض تصمد أمام تغيير وزاري',
      },
      contentType: 'Practice note',
      contentTypeAr: 'ملاحظة تطبيقية',
      language: 'EN',
      meta: 'Jul 2026 · 6 min',
      metaAr: 'يوليو 2026 · 6 د',
      free: 'true',
      publicationDate: '2026-07-20',
      domain: 'Delivery',
      license: 'CC BY 4.0',
      description: 'The mandate note is the cheapest insurance a public engagement can buy.',
    },
  },
  {
    slug: 'small-firms-large-outcomes',
    title: { en: 'Ep. 12 — Small firms, large outcomes', ar: 'الحلقة 12 — شركات صغيرة، نتائج كبيرة' },
    publishedAt: daysAgo(95),
    data: {
      title: { en: 'Ep. 12 — Small firms, large outcomes', ar: 'الحلقة 12 — شركات صغيرة، نتائج كبيرة' },
      contentType: 'Podcast',
      contentTypeAr: 'بودكاست',
      language: 'AR/EN',
      meta: 'Jul 2026 · 41 min',
      metaAr: 'يوليو 2026 · 41 د',
      free: 'true',
      publicationDate: '2026-07-02',
      domain: 'Strategy',
      license: 'CC BY 4.0',
      description: 'A conversation about why small firms can move large public outcomes.',
    },
  },
  {
    slug: 'led-diagnostic-toolkit',
    title: { en: 'LED diagnostic toolkit — open licence', ar: 'حزمة تشخيص التنمية الاقتصادية المحلية — رخصة مفتوحة' },
    publishedAt: daysAgo(120),
    data: {
      title: {
        en: 'LED diagnostic toolkit — open licence',
        ar: 'حزمة تشخيص التنمية الاقتصادية المحلية — رخصة مفتوحة',
      },
      contentType: 'Toolkit',
      contentTypeAr: 'حزمة أدوات',
      language: 'AR/EN',
      meta: 'PDF · 32 pp',
      metaAr: 'PDF · 32 ص',
      free: 'true',
      publicationDate: '2026-06-01',
      domain: 'LED',
      license: 'CC BY 4.0',
      description: 'The diagnostic we use to name a binding constraint, released under an open licence.',
    },
  },
  {
    slug: 'mandate-note-template',
    title: { en: 'Mandate note template', ar: 'قالب مذكرة التفويض' },
    publishedAt: daysAgo(125),
    data: {
      title: { en: 'Mandate note template', ar: 'قالب مذكرة التفويض' },
      contentType: 'Toolkit',
      contentTypeAr: 'حزمة أدوات',
      language: 'EN',
      meta: 'DOCX · 4 pp',
      metaAr: 'DOCX · 4 ص',
      free: 'true',
      publicationDate: '2026-05-18',
      domain: 'Delivery',
      license: 'CC BY 4.0',
      description: 'A four-page template for fixing the question, the client and the decision before work starts.',
    },
  },
]

const instruments: SeedItem[] = [
  {
    slug: 'binding-constraint-diagnostic',
    title: { en: 'Binding-constraint diagnostic', ar: 'تشخيص القيد الملزم' },
    publishedAt: daysAgo(130),
    data: {
      title: { en: 'Binding-constraint diagnostic', ar: 'تشخيص القيد الملزم' },
      domain: 'Diagnosis',
      stage: 'G1',
      whatItIs: {
        en: 'A structured read of institutions, incentives and data that names the one constraint worth moving.',
        ar: 'قراءة منظمة للمؤسسات والحوافز والبيانات تحدد القيد الوحيد الجدير بالتحريك.',
      },
      whenToUse: {
        en: 'At the start of an engagement, before any design work is commissioned.',
        ar: 'في بداية المهمة، قبل تكليف أي عمل تصميمي.',
      },
      produces: {
        en: 'A one-page diagnostic with the constraint, the evidence and the decision it blocks.',
        ar: 'تشخيص من صفحة واحدة يتضمن القيد والأدلة والقرار الذي يعيقه.',
      },
      license: 'CC BY 4.0',
      description: 'Names the binding constraint, not a list of everything.',
    },
  },
  {
    slug: 'regulatory-burden-review',
    title: { en: 'Regulatory burden review', ar: 'مراجعة العبء التنظيمي' },
    publishedAt: daysAgo(132),
    data: {
      title: { en: 'Regulatory burden review', ar: 'مراجعة العبء التنظيمي' },
      domain: 'Policy',
      stage: 'G2',
      whatItIs: {
        en: 'A measured account of what rules cost firms, ranked by removability and effect.',
        ar: 'حساب مقاس لتكلفة القواعد على الشركات، مرتب حسب قابلية الإلغاء والأثر.',
      },
      whenToUse: {
        en: 'When a government wants regulatory reform that firms can feel.',
        ar: 'عندما تريد حكومة إصلاحاً تنظيمياً تشعر به الشركات.',
      },
      produces: {
        en: 'A ranked removal list with owners and an implementation sequence.',
        ar: 'قائمة إلغاء مرتبة مع الجهات المسؤولة وتسلسل التنفيذ.',
      },
      license: 'CC BY 4.0',
      description: 'Measures the real cost of rules and ranks removals.',
    },
  },
  {
    slug: 'blended-finance-structuring',
    title: { en: 'Blended-finance structuring', ar: 'هيكلة التمويل المختلط' },
    publishedAt: daysAgo(134),
    data: {
      title: { en: 'Blended-finance structuring', ar: 'هيكلة التمويل المختلط' },
      domain: 'Finance',
      stage: 'G3',
      whatItIs: {
        en: 'A tranche design that makes a project investable without changing what it is.',
        ar: 'تصميم شرائح يجعل المشروع قابلاً للاستثمار دون تغيير ماهيته.',
      },
      whenToUse: {
        en: 'When a viable project cannot raise commercial capital on its own balance sheet.',
        ar: 'عندما لا يستطيع مشروع قابل للحياة جمع رأس مال تجاري بميزانيته.',
      },
      produces: {
        en: 'A term sheet, a governance note and a matching-facility plan.',
        ar: 'ورقة شروط ومذكرة حوكمة وخطة تسهيل مطابق.',
      },
      license: 'Commercial',
      description: 'Tranches that make a project investable.',
    },
  },
  {
    slug: 'employer-validated-curricula',
    title: { en: 'Employer-validated curricula', ar: 'مناهج معتمدة من أصحاب العمل' },
    publishedAt: daysAgo(136),
    data: {
      title: { en: 'Employer-validated curricula', ar: 'مناهج معتمدة من أصحاب العمل' },
      domain: 'Skills',
      stage: 'G3',
      whatItIs: {
        en: 'A curriculum rebuilt around what employers can confirm they hire for.',
        ar: 'منهج يعاد بناؤه حول ما يؤكد أصحاب العمل أنهم يوظفون من أجله.',
      },
      whenToUse: {
        en: 'When training exists but graduates do not get hired.',
        ar: 'عندما يوجد التدريب لكن الخريجين لا يُوظفون.',
      },
      produces: {
        en: 'Validated modules, trainer notes and an assessment pack.',
        ar: 'وحدات معتمدة وملاحظات مدرب وحزمة تقييم.',
      },
      license: 'CC BY 4.0',
      description: 'Curricula that answer to the employers who hire.',
    },
  },
  {
    slug: 'investment-land-bank-maps',
    title: { en: 'Investment & land-bank maps', ar: 'خرائط الاستثمار وبنك الأرض' },
    publishedAt: daysAgo(138),
    data: {
      title: { en: 'Investment & land-bank maps', ar: 'خرائط الاستثمار وبنك الأرض' },
      domain: 'LED',
      stage: 'G2',
      whatItIs: {
        en: 'A public register of sites and assets, ranked by readiness for investment.',
        ar: 'سجل عام للمواقع والأصول مرتب حسب الجاهزية للاستثمار.',
      },
      whenToUse: {
        en: 'When investment is arriving in the wrong places.',
        ar: 'عندما يصل الاستثمار إلى الأماكن الخطأ.',
      },
      produces: {
        en: 'A land-bank register, a readiness score and three costed opportunity zones.',
        ar: 'سجل بنك أرض ودرجة جاهزية وثلاث مناطق فرص مسعّرة.',
      },
      license: 'CC BY 4.0',
      description: 'Places bankable uses where the services already are.',
    },
  },
  {
    slug: 'coalition-consultation-design',
    title: { en: 'Coalition & consultation design', ar: 'تصميم التحالفات والتشاور' },
    publishedAt: daysAgo(140),
    data: {
      title: { en: 'Coalition & consultation design', ar: 'تصميم التحالفات والتشاور' },
      domain: 'Delivery',
      stage: 'G4',
      whatItIs: {
        en: 'A recorded consultation that answers objections in writing before delivery starts.',
        ar: 'تشاور موثق يجيب على الاعتراضات كتابةً قبل بدء التنفيذ.',
      },
      whenToUse: {
        en: 'When a decision needs ministries, partners and private actors to move together.',
        ar: 'عندما يحتاج قرار ما إلى تحرك الوزارات والشركاء والجهات الخاصة معاً.',
      },
      produces: {
        en: 'A consultation record, an objection log and a signed coalition map.',
        ar: 'سجل تشاور وسجل اعتراضات وخريطة تحالف موقعة.',
      },
      license: 'CC BY 4.0',
      description: 'Builds the coalition and records the objections.',
    },
  },
]

const courses: SeedItem[] = [
  {
    slug: 'local-economic-development-practitioner',
    title: {
      en: 'Local economic development — practitioner course',
      ar: 'التنمية الاقتصادية المحلية — دورة للممارسين',
    },
    publishedAt: daysAgo(10),
    data: {
      title: {
        en: 'Local economic development — practitioner course',
        ar: 'التنمية الاقتصادية المحلية — دورة للممارسين',
      },
      format: 'Three days · in person · Cairo',
      formatAr: 'ثلاثة أيام · حضوري · القاهرة',
      price: 'EGP 18,000 per seat',
      priceAr: '18,000 جنيه للمقعد',
      seats: 8,
      level: 'Practitioner',
      startDate: '2026-11-12',
      booking: 'https://askterramorph.com/contact',
      description: 'A practitioner course in reading a local economy and choosing the lever that moves it.',
    },
  },
  {
    slug: 'train-the-trainer-terramorph-method',
    title: { en: 'Train-the-trainer: the TerraMorph method', ar: 'تدريب المدربين: منهج TerraMorph' },
    publishedAt: daysAgo(14),
    data: {
      title: { en: 'Train-the-trainer: the TerraMorph method', ar: 'تدريب المدربين: منهج TerraMorph' },
      format: 'Five days · blended',
      formatAr: 'خمسة أيام · مدمج',
      price: 'EGP 24,000 per seat',
      priceAr: '24,000 جنيه للمقعد',
      seats: 6,
      level: 'Advanced',
      startDate: '2026-12-01',
      booking: 'https://askterramorph.com/contact',
      description: 'Certification for people who will teach the method inside their own institution.',
    },
  },
  {
    slug: 'tailored-diagnostics-public-institutions',
    title: { en: 'Tailored diagnostics for public institutions', ar: 'تشخيصات مخصصة للمؤسسات العامة' },
    publishedAt: daysAgo(18),
    data: {
      title: { en: 'Tailored diagnostics for public institutions', ar: 'تشخيصات مخصصة للمؤسسات العامة' },
      format: 'Two days · in-house',
      formatAr: 'يومان · داخل المؤسسة',
      price: 'Quoted per cohort',
      priceAr: 'يُسعّر حسب المجموعة',
      seats: 0,
      level: 'Executive',
      startDate: '2027-01-20',
      booking: 'https://askterramorph.com/contact',
      description: 'A closed cohort for one institution, built around one live decision.',
    },
  },
  {
    slug: 'welcome-method-onboarding',
    title: { en: 'Welcome method — onboarding for new teams', ar: 'منهج الترحيب — تأهيل الفرق الجديدة' },
    publishedAt: daysAgo(20),
    data: {
      title: { en: 'Welcome method — onboarding for new teams', ar: 'منهج الترحيب — تأهيل الفرق الجديدة' },
      format: 'Half day · online',
      formatAr: 'نصف يوم · عبر الإنترنت',
      price: 'Included with engagements',
      priceAr: 'مشمول ضمن المهام',
      seats: 0,
      level: 'Foundation',
      startDate: '2026-11-05',
      booking: 'https://askterramorph.com/contact',
      description: 'Orientation for a client team joining a TerraMorph engagement.',
    },
  },
]

const experts: SeedItem[] = [
  {
    slug: 'hanaa-soliman',
    title: { en: 'Dr. Hanaa Soliman', ar: 'د. هناء سليمان' },
    publishedAt: daysAgo(30),
    data: {
      title: { en: 'Dr. Hanaa Soliman', ar: 'د. هناء سليمان' },
      expertise: 'Education systems, TVET reform',
      geography: 'Egypt',
      sector: 'Education',
      country: 'Egypt',
      availability: 'Deployed',
      description: 'Education systems specialist with a focus on employer-validated TVET curricula.',
    },
  },
  {
    slug: 'marcus-adeyemi',
    title: { en: 'Prof. Marcus Adeyemi', ar: 'أ.د. ماركوس أدييمي' },
    publishedAt: daysAgo(31),
    data: {
      title: { en: 'Prof. Marcus Adeyemi', ar: 'أ.د. ماركوس أدييمي' },
      expertise: 'Economics, investment climate',
      geography: 'Nigeria',
      sector: 'Economics',
      country: 'Nigeria',
      availability: 'Vetted',
      description: 'Economist working on investment climate and public-finance reform.',
    },
  },
  {
    slug: 'leila-haddad',
    title: { en: 'Dr. Leila Haddad', ar: 'د. ليلى حداد' },
    publishedAt: daysAgo(32),
    data: {
      title: { en: 'Dr. Leila Haddad', ar: 'د. ليلى حداد' },
      expertise: 'Public health systems',
      geography: 'Lebanon',
      sector: 'Public health',
      country: 'Lebanon',
      availability: 'Matched',
      description: 'Public-health systems specialist focused on delivery in fragile settings.',
    },
  },
  {
    slug: 'tariq-mansour',
    title: { en: 'Eng. Tariq Mansour', ar: 'م. طارق منصور' },
    publishedAt: daysAgo(33),
    data: {
      title: { en: 'Eng. Tariq Mansour', ar: 'م. طارق منصور' },
      expertise: 'Renewable energy, infrastructure',
      geography: 'Morocco',
      sector: 'Renewable energy',
      country: 'Morocco',
      availability: 'Profile complete',
      description: 'Energy engineer with corridor and utility-scale project experience.',
    },
  },
  {
    slug: 'ingrid-lindqvist',
    title: { en: 'Dr. Ingrid Lindqvist', ar: 'د. إنغريد ليندكفيست' },
    publishedAt: daysAgo(34),
    data: {
      title: { en: 'Dr. Ingrid Lindqvist', ar: 'د. إنغريد ليندكفيست' },
      expertise: 'Labour markets, skills',
      geography: 'Sweden',
      sector: 'Labour markets',
      country: 'Sweden',
      availability: 'Registered',
      description: 'Labour economist working on skills matching and activation policy.',
    },
  },
  {
    slug: 'kwame-mensah',
    title: { en: 'Dr. Kwame Mensah', ar: 'د. كوامي منساه' },
    publishedAt: daysAgo(35),
    data: {
      title: { en: 'Dr. Kwame Mensah', ar: 'د. كوامي منساه' },
      expertise: 'Agribusiness, value chains',
      geography: 'Ghana',
      sector: 'Agribusiness',
      country: 'Ghana',
      availability: 'Vetted',
      description: 'Agribusiness specialist in cooperative structures and value-chain finance.',
    },
  },
]

const partners: SeedItem[] = [
  {
    slug: 'giz-programme',
    title: { en: 'GIZ programme', ar: 'برنامج GIZ' },
    publishedAt: daysAgo(40),
    data: {
      title: { en: 'GIZ programme', ar: 'برنامج GIZ' },
      country: 'Germany / Egypt',
      sectors: 'TVET, skills, employment',
      languages: 'EN, AR, DE',
      description: 'Delivery partner on employer-validated TVET reform across fourteen technical schools.',
      capabilities: 'TVET reform, curriculum validation, trainer certification, results measurement.',
    },
  },
  {
    slug: 'delta-impact-fund',
    title: { en: 'Delta Impact Fund', ar: 'صندوق أثر الدلتا' },
    publishedAt: daysAgo(42),
    data: {
      title: { en: 'Delta Impact Fund', ar: 'صندوق أثر الدلتا' },
      country: 'Egypt',
      sectors: 'Social enterprise, agri-processing',
      languages: 'AR, EN',
      description: 'Impact investor in women-led agri-processing cooperatives in the Delta.',
      capabilities: 'Blended finance, first-loss structuring, governance design.',
    },
  },
  {
    slug: 'aast-academy',
    title: { en: 'AAST Academy', ar: 'أكاديمية AAST' },
    publishedAt: daysAgo(44),
    data: {
      title: { en: 'AAST Academy', ar: 'أكاديمية AAST' },
      country: 'Egypt',
      sectors: 'Learning, certification',
      languages: 'AR, EN',
      description: 'Academic partner for train-the-trainer certification and paid internships.',
      capabilities: 'Certification, assessment, internship placement.',
    },
  },
  {
    slug: 'landell-mills',
    title: { en: 'Landell Mills', ar: 'لاندل ميلز' },
    publishedAt: daysAgo(46),
    data: {
      title: { en: 'Landell Mills', ar: 'لاندل ميلز' },
      country: 'United Kingdom',
      sectors: 'Development consulting',
      languages: 'EN, AR',
      description: 'Prime contractor on regional local-economic-development frameworks.',
      capabilities: 'Framework delivery, consortium management, regional LED.',
    },
  },
]

const vacancies: SeedItem[] = [
  {
    slug: 'senior-policy-analyst',
    title: { en: 'Senior policy analyst', ar: 'محلل سياسات أول' },
    publishedAt: daysAgo(9),
    data: {
      title: { en: 'Senior policy analyst', ar: 'محلل سياسات أول' },
      location: 'Cairo',
      salaryBand: 'EGP 22–30k/mo',
      contractType: 'Full time',
      deadline: '2026-12-15',
      description: 'Owns regulatory and investment-climate briefs. Reports to the Director, Policy & Governance.',
    },
  },
  {
    slug: 'led-field-coordinator',
    title: { en: 'LED field coordinator', ar: 'منسق ميداني للتنمية الاقتصادية المحلية' },
    publishedAt: daysAgo(11),
    data: {
      title: { en: 'LED field coordinator', ar: 'منسق ميداني للتنمية الاقتصادية المحلية' },
      location: 'Assiut',
      salaryBand: 'EGP 14–18k/mo',
      contractType: '12 months',
      deadline: '2026-11-30',
      description: 'Runs field delivery for governorate engagements in Upper Egypt.',
    },
  },
  {
    slug: 'data-analyst-gis',
    title: { en: 'Data analyst (GIS)', ar: 'محلل بيانات (نظم معلومات جغرافية)' },
    publishedAt: daysAgo(13),
    data: {
      title: { en: 'Data analyst (GIS)', ar: 'محلل بيانات (نظم معلومات جغرافية)' },
      location: 'Cairo / hybrid',
      salaryBand: 'EGP 16–22k/mo',
      contractType: 'Full time',
      deadline: '2026-12-01',
      description: 'Builds and maintains our land-bank maps and index products.',
    },
  },
  {
    slug: 'learning-associate',
    title: { en: 'Learning associate', ar: 'مساعد تعلّم' },
    publishedAt: daysAgo(15),
    data: {
      title: { en: 'Learning associate', ar: 'مساعد تعلّم' },
      location: 'Cairo',
      salaryBand: 'EGP 13–17k/mo',
      contractType: 'Full time',
      deadline: '2026-11-20',
      description: 'Supports the course catalogue and train-the-trainer cohorts.',
    },
  },
]

const initiatives: SeedItem[] = [
  {
    slug: 'local-leverage-index',
    title: { en: 'Local Leverage Index', ar: 'مؤشر الرافعة المحلية' },
    publishedAt: daysAgo(50),
    data: {
      title: { en: 'Local Leverage Index', ar: 'مؤشر الرافعة المحلية' },
      status: 'In development',
      meta: 'Data product',
      description: 'A comparable measure of how much public money leverages per governorate.',
    },
  },
  {
    slug: 'investment-climate-tracker',
    title: { en: 'Investment Climate Tracker', ar: 'متتبع مناخ الاستثمار' },
    publishedAt: daysAgo(52),
    data: {
      title: { en: 'Investment Climate Tracker', ar: 'متتبع مناخ الاستثمار' },
      status: 'In development',
      meta: 'Data product',
      description: 'A quarterly read of the reforms firms can actually feel.',
    },
  },
  {
    slug: 'tvet-demand-register',
    title: { en: 'TVET Demand Register', ar: 'سجل الطلب على التعليم الفني' },
    publishedAt: daysAgo(54),
    data: {
      title: { en: 'TVET Demand Register', ar: 'سجل الطلب على التعليم الفني' },
      status: 'In development',
      meta: 'Data product',
      description: 'Employer-confirmed demand, by occupation and governorate.',
    },
  },
]

const audiences: SeedItem[] = [
  {
    slug: 'governments',
    title: { en: 'For governments', ar: 'للحكومات' },
    publishedAt: daysAgo(5),
    data: {
      title: { en: 'For governments', ar: 'للحكومات' },
      heading: { en: 'For governments', ar: 'للحكومات' },
      standfirst: {
        en: 'Governorates, ministries and authorities — mandate-mapped work inside your rules.',
        ar: 'محافظات ووزارات وهيئات — عمل موثّق بالتكليف داخل قواعدكم.',
      },
      short: { en: 'public institutions', ar: 'المؤسسات العامة' },
      kicker: { en: 'Public sector', ar: 'القطاع العام' },
      intro: {
        en: 'Governorates, ministries and public authorities hire us for one reason: we do the work inside your procurement framework, with your own planners in the room, and hand back something your institution can defend.',
        ar: 'توظفنا المحافظات والوزارات والهيئات العامة لسبب واحد: نعمل داخل إطار المشتريات لديكم، بمشاركة مخططيكم، ونسلّم شيئاً يمكن لمؤسستكم الدفاع عنه.',
      },
      meta: {
        en: 'TerraMorph works with governorates, ministries and public authorities in Egypt — mandate-mapped, procurement-ready, and delivered inside the client’s own rules.',
        ar: 'تعمل TerraMorph مع المحافظات والوزارات والهيئات العامة في مصر — وفق التكليف، وجاهزة للمشتريات، وتُنفّذ داخل قواعد العميل.',
      },
      questions: {
        en: 'Can you work inside our rules?\nHave you done this in Egypt?\nWhat will it cost us to find out?',
        ar: 'هل تعملون داخل قواعدنا؟\nهل نفّذتم ذلك في مصر؟\nكم يكلفنا أن نعرف؟',
      },
      cta: { en: 'Download the procurement pack', ar: 'حمّل حزمة المشتريات' },
      order: 1,
    },
  },
  {
    slug: 'development-partners',
    title: { en: 'For development partners', ar: 'لشركاء التنمية' },
    publishedAt: daysAgo(5),
    data: {
      title: { en: 'For development partners', ar: 'لشركاء التنمية' },
      heading: { en: 'For development partners', ar: 'لشركاء التنمية' },
      standfirst: {
        en: 'Registration identifiers, framework eligibility and a full assignment ledger.',
        ar: 'معرّفات التسجيل وأهلية الأُطر وسجل مهام كامل.',
      },
      short: { en: 'programmes and donors', ar: 'البرامج والمانحون' },
      kicker: { en: 'Donor-funded delivery', ar: 'التنفيذ الممول من المانحين' },
      intro: {
        en: 'Programmes and donors need a delivery partner they can verify, not a brochure. We publish our registration identifiers, framework eligibility and the whole assignment ledger — then deliver with the evidence trail the audit will ask for.',
        ar: 'تحتاج البرامج والمانحون إلى شريك تنفيذ يمكن التحقق منه، لا كتيّب. ننشر معرّفات تسجيلنا وأهلية الأُطر وسجل المهام كاملاً — ثم ننفّذ مع أثر الأدلة الذي سيطلبه التدقيق.',
      },
      meta: {
        en: 'TerraMorph supports donor-funded programmes with registered, framework-eligible delivery and a full, verifiable assignment ledger.',
        ar: 'تدعم TerraMorph البرامج الممولة من المانحين بتنفيذ مسجل ومؤهل للأُطر وسجل مهام كامل قابل للتحقق.',
      },
      questions: {
        en: 'Are you registered and eligible?\nWhere is the evidence?\nWho exactly delivers?',
        ar: 'هل أنتم مسجّلون ومؤهلون؟\nأين الأدلة؟\nمن الذي ينفّذ بالضبط؟',
      },
      cta: { en: 'Request the capability statement', ar: 'اطلب بيان القدرات' },
      order: 2,
    },
  },
  {
    slug: 'business',
    title: { en: 'For business', ar: 'للأعمال' },
    publishedAt: daysAgo(5),
    data: {
      title: { en: 'For business', ar: 'للأعمال' },
      heading: { en: 'For business', ar: 'للأعمال' },
      standfirst: {
        en: 'A price-bearing diagnostic and a bookable date — not a sales call.',
        ar: 'تشخيص معلن السعر وموعد قابل للحجز — لا مكالمة بيع.',
      },
      short: { en: 'enterprises and investors', ar: 'الشركات والمستثمرون' },
      kicker: { en: 'Private sector', ar: 'القطاع الخاص' },
      intro: {
        en: 'Enterprises and investors do not need another pitch deck. Book a fixed-price diagnostic with a real date, get costed options with their risks, and decide with the numbers in front of you.',
        ar: 'لا تحتاج الشركات والمستثمرون إلى عرض تقديمي آخر. احجز تشخيصاً بسعر ثابت وموعد حقيقي، واحصل على خيارات مسعّرة بمخاطرها، وقرّر والأرقام أمامك.',
      },
      meta: {
        en: 'TerraMorph for business: a price-bearing diagnostic with a bookable date, costed options and a clear decision — no sales call.',
        ar: 'TerraMorph للأعمال: تشخيص معلن السعر بموعد قابل للحجز وخيارات مسعّرة وقرار واضح — دون مكالمة بيع.',
      },
      questions: {
        en: 'What does it cost?\nWhen can you start?\nWhat do we get at the end?',
        ar: 'كم تبلغ التكلفة؟\nمتى يمكنكم البدء؟\nماذا نحصل عليه في النهاية؟',
      },
      cta: { en: 'Book the diagnostic', ar: 'احجز التشخيص' },
      order: 3,
    },
  },
  {
    slug: 'ngos',
    title: { en: 'For NGOs', ar: 'للمنظمات غير الحكومية' },
    publishedAt: daysAgo(5),
    data: {
      title: { en: 'For NGOs', ar: 'للمنظمات غير الحكومية' },
      heading: { en: 'For NGOs', ar: 'للمنظمات غير الحكومية' },
      standfirst: {
        en: 'Free method notes, open-licence tools and a scaled-down engagement model.',
        ar: 'ملاحظات منهجية مجانية وأدوات برخصة مفتوحة ونموذج تعاون مصغّر.',
      },
      short: { en: 'civil society', ar: 'المجتمع المدني' },
      kicker: { en: 'Civil society', ar: 'المجتمع المدني' },
      intro: {
        en: 'NGOs and social enterprises get the same method we sell to governments — the notes, the templates and the tools are open. Start free, build capacity in your own team, and pay only if and when you need us embedded.',
        ar: 'تحصل المنظمات غير الحكومية والمشروعات الاجتماعية على المنهج نفسه الذي نبيعه للحكومات — الملاحظات والقوالب والأدوات مفتوحة. ابدأ مجاناً، وابنِ القدرات في فريقك، وادفع فقط عندما تحتاج إلينا.',
      },
      meta: {
        en: 'TerraMorph for NGOs and social enterprises: free open-licence method notes, templates and a scaled engagement model for small budgets.',
        ar: 'TerraMorph للمنظمات غير الحكومية والمشروعات الاجتماعية: ملاحظات منهجية مجانية برخصة مفتوحة وقوالب ونموذج تعاون مصغّر للميزانيات الصغيرة.',
      },
      questions: {
        en: 'What is free?\nCan you fit a small budget?\nWill you build our capacity?',
        ar: 'ما المجاني؟\nهل تناسبكم ميزانية صغيرة؟\nهل ستبنون قدراتنا؟',
      },
      cta: { en: 'Get the free toolkit', ar: 'احصل على الأداة المجانية' },
      order: 4,
    },
  },
  {
    slug: 'consultancies',
    title: { en: 'For consultancies', ar: 'للاستشاريين' },
    publishedAt: daysAgo(5),
    data: {
      title: { en: 'For consultancies', ar: 'للاستشاريين' },
      heading: { en: 'For consultancies', ar: 'للاستشاريين' },
      standfirst: {
        en: 'A specialist sub-partner with method, local reach and clean compliance.',
        ar: 'شريك متخصص من الباطن يقدّم المنهج والانتشار المحلي والامتثال النظيف.',
      },
      short: { en: 'primes and consultancies', ar: 'الشركات الرئيسية والاستشارات' },
      kicker: { en: 'Teaming', ar: 'الشراكة التنفيذية' },
      intro: {
        en: 'Primes and consultancies team with us when a bid needs a specialist who is registered, compliant and actually on the ground. We bring the method, the local network and a compliance file that clears due diligence.',
        ar: 'تتحالف معنا الشركات الرئيسية والاستشارية عندما تحتاج مناقصة إلى متخصص مسجل وممتثل وحاضر فعلياً على الأرض. نقدّم المنهج والشبكة المحلية وملف امتثال يجتاز التدقيق.',
      },
      meta: {
        en: 'TerraMorph teams with primes and consultancies: specialist sub-partnership, a vetted expert bench and a clean, verifiable compliance file.',
        ar: 'تتحالف TerraMorph مع الشركات الرئيسية والاستشارية: شراكة متخصصة من الباطن وفريق خبراء معتمد وملف امتثال نظيف قابل للتحقق.',
      },
      questions: {
        en: 'What do you bring to a bid?\nAre you compliant?\nWho signs the CVs?',
        ar: 'ماذا تقدّمون في المناقصة؟\nهل أنتم ممتثلون؟\nمن يوقّع السير الذاتية؟',
      },
      cta: { en: 'Propose a teaming arrangement', ar: 'اقترح شراكة تنفيذية' },
      order: 5,
    },
  },
  {
    slug: 'careers',
    title: { en: 'Careers', ar: 'الوظائف' },
    publishedAt: daysAgo(5),
    data: {
      title: { en: 'Careers', ar: 'الوظائف' },
      heading: { en: 'Careers', ar: 'الوظائف' },
      standfirst: {
        en: 'Vacancies, internships with AAST, and a firm that names its people.',
        ar: 'وظائف وتدريبات مع الأكاديمية العربية، وشركة تُسمّي أفرادها.',
      },
      short: { en: 'people who join us', ar: 'من ينضم إلينا' },
      kicker: { en: 'Join the team', ar: 'انضم إلى الفريق' },
      intro: {
        en: 'We name our people, so you know exactly who you would be joining. Every role lists a salary band, and the people who interview you are the people you would work with.',
        ar: 'نسمّي أفرادنا، لتعرف بالضبط من ستنضم إليه. كل دور يعلن نطاق راتبه، ومن يقابلونك هم من ستعمل معهم.',
      },
      meta: {
        en: 'Careers at TerraMorph: open roles with published salary bands, named teams and a hiring process you can see.',
        ar: 'الوظائف في TerraMorph: أدوار مفتوحة بنطاقات رواتب معلنة وفرق مسماة وعملية توظيف واضحة.',
      },
      questions: {
        en: 'What roles are open?\nHow do you grow people?\nWho would I work with?',
        ar: 'ما الوظائف المتاحة؟\nكيف تنمّون الكفاءات؟\nمع من سأعمل؟',
      },
      cta: { en: 'See open roles', ar: 'اطّلع على الوظائف المتاحة' },
      order: 6,
    },
  },
  {
    slug: 'experts',
    title: { en: 'Expert network', ar: 'شبكة الخبراء' },
    publishedAt: daysAgo(5),
    data: {
      title: { en: 'Expert network', ar: 'شبكة الخبراء' },
      heading: { en: 'Expert network', ar: 'شبكة الخبراء' },
      standfirst: {
        en: 'Register once, see your status, and be matched to live assignments.',
        ar: 'سجّل مرة واحدة، تابع حالتك، وطابِق مهامًا قائمة.',
      },
      short: { en: 'registered experts', ar: 'الخبراء المسجلون' },
      kicker: { en: 'Expert network', ar: 'شبكة الخبراء' },
      intro: {
        en: 'The expert network is how specialists join our work. Register once, watch your status move, and get matched to live assignments — never a dead-end CV upload.',
        ar: 'شبكة الخبراء هي طريق المتخصصين للانضمام إلى عملنا. سجّل مرة واحدة، وتابع تحرّك حالتك، وطابِق مهامًا قائمة — لا رفع سيرة بلا نتيجة.',
      },
      meta: {
        en: 'Register for the TerraMorph expert network: a visible status at every step and matching to live assignments.',
        ar: 'سجّل في شبكة خبراء TerraMorph: حالة ظاهرة في كل خطوة ومطابقة مع مهام قائمة.',
      },
      questions: {
        en: 'What happens after I register?\nHow are experts matched?\nHow are fees set?',
        ar: 'ماذا يحدث بعد التسجيل؟\nكيف يُطابق الخبراء؟\nكيف تُحدّد الأتعاب؟',
      },
      cta: { en: 'Register as an expert', ar: 'سجّل كخبير' },
      order: 7,
    },
  },
]

const stages: SeedItem[] = [
  ['G0', 'Mandate', 'التفويض', '1–2 wks', 'أسبوع–أسبوعان', 'Mandate note', 'مذكرة التفويض'],
  ['G1', 'Diagnose', 'التشخيص', '2–4 wks', 'أسبوعان–أربعة', 'Binding-constraint diagnostic', 'تشخيص القيد الملزم'],
  ['G2', 'Locate the lever', 'تحديد الرافعة', '1–2 wks', 'أسبوع–أسبوعان', 'Lever map', 'خريطة الرافعة'],
  ['G3', 'Design', 'التصميم', '3–6 wks', 'ثلاثة–ستة أسابيع', 'Instrument design', 'تصميم الأداة'],
  ['G4', 'Align', 'المواءمة', '2–4 wks', 'أسبوعان–أربعة', 'Consultation record', 'سجل التشاور'],
  ['G5', 'Deliver', 'التنفيذ', 'Variable', 'متغيّر', 'Delivery dashboard', 'لوحة التنفيذ'],
  ['G6', 'Measure', 'القياس', 'Quarterly', 'ربع سنوي', 'Verified results note', 'مذكرة نتائج موثقة'],
  ['G7', 'Transfer', 'نقل المعرفة', '4–8 wks', 'أربعة–ثمانية أسابيع', 'Transfer kit & certified trainers', 'حزمة النقل والمدربون المعتمدون'],
].map(([id, en, ar, timeEn, timeAr, outEn, outAr], index) => ({
  slug: String(id).toLowerCase(),
  title: { en: String(en), ar: String(ar) },
  publishedAt: daysAgo(60 + index),
  data: {
    title: { en: String(en), ar: String(ar) },
    time: { en: String(timeEn), ar: String(timeAr) },
    output: { en: String(outEn), ar: String(outAr) },
    order: index,
    description: `${String(id)} — ${String(en)}.`,
  },
}))

const collections: Array<{ id: string; kind: string; items: SeedItem[] }> = [
  { id: 'assignments', kind: 'ASSIGNMENT', items: assignments },
  { id: 'cases', kind: 'CASE', items: cases },
  { id: 'publications', kind: 'PUBLICATION', items: publications },
  { id: 'instruments', kind: 'INSTRUMENT', items: instruments },
  { id: 'courses', kind: 'COURSE', items: courses },
  { id: 'experts', kind: 'EXPERT', items: experts },
  { id: 'partners', kind: 'PARTNER', items: partners },
  { id: 'vacancies', kind: 'VACANCY', items: vacancies },
  { id: 'initiatives', kind: 'INITIATIVE', items: initiatives },
  { id: 'audiences', kind: 'AUDIENCE', items: audiences },
  { id: 'stages', kind: 'STAGE', items: stages },
]

export async function seedContent(prisma: PrismaClient, workspaceId: string, userId: string) {
  const counts: Record<string, number> = {}
  for (const collection of collections) {
    let count = 0
    for (const item of collection.items) {
      await prisma.contentItem.upsert({
        where: {
          workspaceId_kind_slug: {
            workspaceId,
            kind: collection.kind as never,
            slug: item.slug,
          },
        },
        update: {
          status: 'PUBLISHED',
          title: item.title.en,
          data: item.data as Prisma.InputJsonValue,
          publishedAt: new Date(item.publishedAt),
          updatedById: userId,
        },
        create: {
          workspaceId,
          kind: collection.kind as never,
          status: 'PUBLISHED',
          slug: item.slug,
          title: item.title.en,
          data: item.data as Prisma.InputJsonValue,
          publishedAt: new Date(item.publishedAt),
          createdById: userId,
          updatedById: userId,
        },
      })
      count += 1
    }
    counts[collection.id] = count
  }
  return counts
}
