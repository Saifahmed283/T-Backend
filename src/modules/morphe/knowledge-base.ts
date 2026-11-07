/**
 * Morphe knowledge base - TerraMorph website content for the chatbot.
 *
 * These Q&A pairs are derived from the actual website content
 * (hubs, method gates, LDIA, case studies, legal, contact).
 * The backend checks this first, before running the flow engine,
 * so knowledge questions never derail the qualification conversation.
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
  {
    id: "about",
    triggers: ["about", "who", "what is terramorph", "company", "organization", "cairo", "egypt", "founded"],
    en:
      "TerraMorph is a Cairo-based social cause incubation company. We shape ideas into structured, fundable cases and guide them through a gated lifecycle (G0 to G7). There's also TerraMorph Society, the community-facing side.",
    ar:
      "شركة تيرامورف هي شركة حاضنة للأسباب الاجتماعية مقرها القاهرة. نصوغ الأفكار إلى حالات منظمة وقابلة للتمويل ونوجهها خلال دورة حياة بواباتية (من G0 إلى G7). وهناك أيضًا مجتمع شركة تيرامورف، الجانب المجتمعي.",
    links: [
      { id: "about", url: "/about", label: "About TerraMorph", labelAr: "عن شركة تيرامورف" },
      { id: "society", url: "/about", label: "TerraMorph Society", labelAr: "مجتمع شركة تيرامورف" },
    ],
  },
  {
    id: "methodology",
    triggers: ["methodology", "gate", "g0", "g7", "lifecycle", "process", "how it works"],
    en:
      "TerraMorph uses a gated lifecycle, G0 through G7. Each gate is a checkpoint where an idea must prove it's ready to advance — from raw concept at G0 to full leveraged scale by G7. Gates: G0 mandate & question, G1 diagnostic, G2 leverage, G3 instrument design, G4 coalition, G5 implementation support, G6 verification, G7 handover.",
    ar:
      "تستخدم شركة تيرامورف دورة حياة بواباتية، من G0 إلى G7. كل بوابة هي نقطة تفتيش حيث يجب أن تثبت الفكرة جاهزيتها للتقدم — من الفكرة الخام عند G0 إلى الحجم المُضاعف الكامل عند G7. البوابات: G0 الأمر والسؤال، G1 التشخيص، G2 الرافعة، G3 تصميم الأداة، G4 التحالف، G5 دعم التنفيذ، G6 التحقق، G7 التسليم.",
    links: [
      { id: "methodology", url: "/method", label: "The G0-G7 Gated Lifecycle", labelAr: "دورة الحياة البواباتية G0-G7" },
    ],
  },
  {
    id: "g0",
    triggers: ["g0", "gate 0", "ignition", "mandate", "question", "fix the question"],
    en:
      "G0 — The Ignition Gate. Fix the question, the client, the decision it serves, and the rules it must live inside. Nothing starts without a signed mandate note.",
    ar:
      "G0 — بوابة الإشعال. حدد السؤال، والعميل، والقرار الذي يخدمه، والقواعد التي يجب أن تعيش داخلها. لا يبدأ شيء بدون مذكرة مهمة موقعة.",
    links: [
      { id: "methodology", url: "/method", label: "G0-G7 Gated Lifecycle", labelAr: "دورة الحياة البواباتية" },
    ],
  },
  {
    id: "g1",
    triggers: ["g1", "gate 1", "diagnostic", "binding constraint", "read the ground"],
    en:
      "G1 — Diagnostic Gate. Read the ground as it is: institutions, incentives, data. A diagnostic that names the binding constraint, not a list of everything.",
    ar:
      "G1 — بوابة التشخيص. اقرأ الواقع كما هو: المؤسسات، والحوافز، والبيانات. تشخيص يحدد القيد الملزم، ليست مجرد قائمة بكل شيء.",
    links: [
      { id: "methodology", url: "/method", label: "G0-G7 Gated Lifecycle", labelAr: "دورة الحياة البواباتية" },
    ],
  },
  {
    id: "g2",
    triggers: ["g2", "gate 2", "leverage", "smallest force", "compound"],
    en:
      "G2 — Leverage Gate. Find the smallest well-placed force that moves the largest outcome — capital, policy or know-how, where it compounds.",
    ar:
      "G2 — بوابة الرافعة. اعثر على أصغر قوة موضوعة جيدًا تحرك أكبر نتيجة — رأس المال، أو السياسة، أو الخبرة، حيث تتضاعف.",
    links: [
      { id: "methodology", url: "/method", label: "G0-G7 Gated Lifecycle", labelAr: "دورة الحياة البواباتية" },
    ],
  },
  {
    id: "g3",
    triggers: ["g3", "gate 3", "instrument", "costed options", "risk register"],
    en:
      "G3 — Instrument Gate. Instrument design with costed options, owners and sequencing. Each option carries its own risk register.",
    ar:
      "G3 — بوابة الأداة. تصميم الأداة مع خيارات مدفوعة التكلفة، وأصحاب وجدولة. كل خيار يحمل سجل مخاطر خاص به.",
    links: [
      { id: "methodology", url: "/method", label: "G0-G7 Gated Lifecycle", labelAr: "دورة الحياة البواباتية" },
    ],
  },
  {
    id: "g4",
    triggers: ["g4", "gate 4", "coalition", "partnership", "consultation"],
    en:
      "G4 — Coalition Gate. Build the coalition: ministries, partners, private actors. Consultation recorded, objections answered in writing.",
    ar:
      "G4 — بوابة التحالف. بنِ التحالف: الوزارات، والشركاء، وأصحاب المصلحة من القطاع الخاص. التشاور مُسجل، والاعتراضات تُجاب عليها كتابيًا.",
    links: [
      { id: "methodology", url: "/method", label: "G0-G7 Gated Lifecycle", labelAr: "دورة الحياة البواباتية" },
    ],
  },
  {
    id: "g5",
    triggers: ["g5", "gate 5", "implementation", "dashboard", "indicators"],
    en:
      "G5 — Implementation Gate. Implementation support embedded in the client institution, with monthly dashboards against the agreed indicators.",
    ar:
      "G5 — بوابة التنفيذ. دعم التنفيذ مدمج داخل مؤسسة العميل، مع لوحات معلومات شهرية مقابل المؤشرات المتفق عليها.",
    links: [
      { id: "methodology", url: "/method", label: "G0-G7 Gated Lifecycle", labelAr: "دورة الحياة البواباتية" },
    ],
  },
  {
    id: "g6",
    triggers: ["g6", "gate 6", "verify", "outcomes", "baseline", "publish"],
    en:
      "G6 — Verification Gate. Verify outcomes against baseline. Results published with method, so they can be checked by anyone.",
    ar:
      "G6 — بوابة التحقق. التحقق من النتائج مقابل الخط الأساسي. النتائج منشورة مع الطريقة، حتى يمكن لأي شخص التحقق منها.",
    links: [
      { id: "methodology", url: "/method", label: "G0-G7 Gated Lifecycle", labelAr: "دورة الحياة البواباتية" },
    ],
  },
  {
    id: "g7",
    triggers: ["g7", "gate 7", "handover", "transfer", "no longer needs"],
    en:
      "G7 — Handover Gate. Hand over method, tools and trained people. The engagement is successful when the client no longer needs us.",
    ar:
      "G7 — بوابة التسليم. تسليم الطريقة، والأدوات والأشخاص المدربين. النجاح عندما لا يحتاج العميل إلينا بعد.",
    links: [
      { id: "methodology", url: "/method", label: "G0-G7 Gated Lifecycle", labelAr: "دورة الحياة البواباتية" },
    ],
  },
  {
    id: "ldia",
    triggers: ["ldia", "architecture", "lever", "align", "instrument", "deliver", "verify", "publish", "transfer"],
    en:
      "LDIA is TerraMorph's delivery architecture: Find the lever, align; Design costed instruments; Deliver embedded, in place; Verify, publish, transfer. It's how we move from idea to verified outcome.",
    ar:
      "الهندسة المعمارية للتسليم في شركة تيرامورف: اعثر على الرافعة، وقم بمحاذاة؛ صمم أدواتًا مدفوعة التكلفة؛ سَلّم مدمجًا في المكان؛ تحقّق، وانشر، وانقل. هذه الطريقة التي نتحرك بها من الفكرة إلى النتيجة المؤكدة.",
    links: [
      { id: "ldia", url: "/method/ldia", label: "The LDIA Architecture", labelAr: "هندسة LDIA المعمارية" },
    ],
  },
  {
    id: "services",
    triggers: ["service", "advisory", "strategy", "policy", "transformation", "what do you do", "offer"],
    en:
      "TerraMorph works as a strategy, policy, and transformation advisory. We shape ideas into structured, fundable cases and guide them through the gated process. Services include diagnostics, instrument design, coalition building, implementation support, and verification.",
    ar:
      "تعمل شركة تيرامورف كاستشاري استراتيجية، وسياسة، وتحول. نصوغ الأفكار إلى حالات منظمة وقابلة للتمويل ونوجهها خلال العملية البواباتية. تشمل الخدمات التشخيص، وتصميم الأدوات، وبناء التحالفات، ودعم التنفيذ، والتحقق.",
    links: [
      { id: "services", url: "/for", label: "Advisory Services", labelAr: "خدمات الاستشارات" },
    ],
  },
  {
    id: "governments",
    triggers: ["government", "governorate", "ministry", "public sector", "procurement", "mandate"],
    en:
      "For governments: TerraMorph works with governorates, ministries and public authorities in Egypt — mandate-mapped, procurement-ready, and delivered inside the client's own rules. Public engagements: 11 policies improved, governorates reached across Egypt.",
    ar:
      "للحكومات: تعمل شركة تيرامورف مع المحافظات والوزارات والسلطات العامة في مصر — مت mapa التفويض، وجاهزة للمشتريات، ومقدمة داخل قواعد العميل الخاصة. المساهمات العامة: 11 سياسة محسنة، ومحافظات مشمولة عبر مصر.",
    links: [
      { id: "governments", url: "/hub/governments", label: "For Governments", labelAr: "للحكومات" },
    ],
  },
  {
    id: "partners",
    triggers: ["partner", "development partner", "donor", "funding", "investor", "funder"],
    en:
      "For development partners: TerraMorph supports donor-funded programmes with registered, framework-eligible delivery and a full, verifiable assignment ledger. Partner engagements: 58 ledger entries, 94% repeat or referred.",
    ar:
      "لشركاء التنمية: تدعم شركة تيرامورف البرامج الممولة من المانحين بتسجيل المسجل، والتسليم المؤهل للإطار، وسجل المهام الكامل القابل للتحقق. الشراكات مع الشركاء: 58 إدخال سجل، و94% إعادة إحالة أو مشارَة.",
    links: [
      { id: "partners", url: "/hub/development-partners", label: "Partnership Models", labelAr: "نماذج الشراكة" },
    ],
  },
  {
    id: "business",
    triggers: ["business", "private sector", "diagnostic", "bookable", "fixed price", "capital"],
    en:
      "For business: a price-bearing diagnostic with a bookable date, costed options and a clear decision — no sales call. Reply time: 2 days. Leverage per EGP fee: 0.7x portfolio median.",
    ar:
      "للأعمال: تشخيص مدفوع الثمن مع تاريخ محجوز، وخيارات مدفوعة التكلفة وقرار واضح — بدون مكالمة مبيعات. وقت الرد: يومان. الرافعة لكل جنيه مصري رسوم: 0.7x الوسيط في المحفظة.",
    links: [
      { id: "business", url: "/hub/business", label: "For Business", labelAr: "للأعمال" },
    ],
  },
  {
    id: "ngos",
    triggers: ["ngo", "social enterprise", "civil society", "capacity", "open licence", "toolkit"],
    en:
      "For NGOs: TerraMorph supports civil society with open-licence tools, free toolkits, and capacity-building partnerships. We work on livelihoods, youth empowerment, skills training, and underserved areas.",
    ar:
      "لمنظمات المجتمع المدني: تدعم شركة تيرامورف المجتمع المدني بأدوات ترخيص مفتوح، وحزم أدوات مجانية، وشراكات بناء القدرات. نعمل على سبل العيش، وتمكين الشباب، والتدريب على المهارات، والمناطق المحرومة.",
    links: [
      { id: "ngos", url: "/hub/ngos", label: "For NGOs", labelAr: "لمنظمات المجتمع المدني" },
    ],
  },
  {
    id: "consultancies",
    triggers: ["consultancy", "consulting", "alliance", "strategic", "framework"],
    en:
      "For consultancies: strategic alliance and framework partnership models. We collaborate on delivery, M&E, and skills transfer across sectors.",
    ar:
      "للاستشاريين: نماذج التحالف الاستراتيجي والشراكة الإطارية. نتعاون في التنفيذ، والمراقبة والتقييم، ونقل المهارات عبر القطاعات.",
    links: [
      { id: "consultancies", url: "/hub/consultancies", label: "For Consultancies", labelAr: "للاستشاريين" },
    ],
  },
  {
    id: "careers",
    triggers: ["career", "job", "work with us", "join", "expert", "expert network", "careers"],
    en:
      "Careers & Experts Network: TerraMorph works with experts and associates across governance, climate, health, livelihoods, and more. Apply to join our expert network or view current opportunities.",
    ar:
      "الوظائف وشبكة الخبراء: تعمل شركة تيرامورف مع خبراء وأعضاء associés عبر الحوكمة، والمناخ، والصحة، وسبل العيش، والمزيد. تقدم للانضمام إلى شبكة خبرائنا أو اعرض الفرص الحالية.",
    links: [
      { id: "careers", url: "/join/careers", label: "Careers & Experts", labelAr: "الوظائف والخبراء" },
    ],
  },
  {
    id: "case-studies",
    triggers: ["case study", "evidence", "impact", "assiut", "1.2bn", "result", "verified"],
    en:
      "Case studies are written to be checked. A governorate investment map moved EGP 1.2bn across three underused industrial zones matched with 46 financeable uses. Impact report 2026 published with its underlying data.",
    ar:
      "دراسات الحالة مكتوبة حتى يتم التحقق منها. خريطة استثمار محافظة نقلت 1.2 مليار جنيه مصري عبر ثلاث مناطق صناعية غير مستغلة جيدًا تم مطابقتها مع 46 استخدامًا قابلًا للتمويل. تقرير الأثر 2026 منشور مع بياناته الأساسية.",
    links: [
      { id: "case-studies", url: "/evidence/case-studies", label: "Case Studies", labelAr: "دراسات الحالة" },
    ],
  },
  {
    id: "certifications",
    triggers: ["certification", "iso", "compliance", "anti-bribery", "certificate"],
    en:
      "Certifications & compliance marks: ISO 37001:2022 (anti-bribery), ISO/IEC 27001:2022 (information security), ISO 9001:2015 (quality management). Verified certificate copies available on request.",
    ar:
      "الشهادات وعلامات الامتثال: ISO 37001:2022 (مكافحة الرشوة)، ISO/IEC 27001:2022 (أمن المعلومات)، ISO 9001:2015 (إدارة الجودة). نسخ معتمدة من الشهادات متاحة عند الطلب.",
    links: [
      { id: "certifications", url: "/evidence/certifications", label: "Certifications", labelAr: "الشهادات" },
    ],
  },
  {
    id: "contact",
    triggers: ["contact", "reach", "email", "phone", "follow up", "team", "where are you"],
    en:
      "Contact the TerraMorph team: privacy@askterramorph.com for data protection, copyright@askterramorph.com for DMCA, or use the contact page. We're based in New Cairo, Egypt. CR No. 184 562, TIN 742-118-903.",
    ar:
      "اتصل بفريق شركة تيرامورف: privacy@askterramorph.com لحماية البيانات، copyright@askterramorph.com لـ DMCA، أو استخدم صفحة الاتصال. نحن مقرنا في القاهرة الجديدة، مصر. السجل التجاري 184 562، الرقم الضريبي 742-118-903.",
    links: [
      { id: "contact", url: "/contact", label: "Contact the Team", labelAr: "تواصل مع الفريق" },
    ],
  },
  {
    id: "data-request",
    triggers: ["data request", "access", "delete", "privacy", "gdpr", "personal data", "my data"],
    en:
      "Data subject rights: you can request access to, rectification of, or deletion of your personal data via the Data Request page. We respond within 30 days. Email privacy@askterramorph.com.",
    ar:
      "حقوق أصحاب البيانات: يمكنك 요청 الوصول إلى، أو تصحيح، أو حذف بياناتك الشخصية عبر صفحة طلب البيانات. نرد خلال 30 يومًا. راسل privacy@askterramorph.com.",
    links: [
      { id: "data-request", url: "/data-request", label: "Data Request", labelAr: "طلب بيانات" },
    ],
  },
  {
    id: "marketing",
    triggers: ["newsletter", "marketing", "unsubscribe", "opt-in", "email list"],
    en:
      "Marketing: We only send emails with your explicit opt-in. Granular lists: newsletter, events, insights, careers. Every email includes a one-click unsubscribe link.",
    ar:
      "التسويق: نرسل رسائل بريد إلكتروني فقط بموافقتك الصريحة. قوائم مفصلة: النشرة الإخبارية، الأحداث، الرؤى، الوظائف. كل بريد إلكتروني يتضمن رابط إلغاء اشتراك بنقرة واحدة.",
    links: [
      { id: "unsubscribe", url: "/unsubscribe", label: "Unsubscribe", labelAr: "إلغاء الاشتراك" },
    ],
  },
  {
    id: "cookies",
    triggers: ["cookie", "consent", "tracking", "analytics", "essential"],
    en:
      "Cookies: We use essential cookies for session and security. Analytics and marketing cookies are optional and require your consent. You can manage preferences via the cookie banner or the Cookie Policy page.",
    ar:
      "ملفات تعريف الارتباط: نستخدم ملفات تعريف الارتباط الأساسية للجلسة والأمان. ملفات تعريف الارتباط التحليلية والتسويقية اختيارية وتتطلب موافقتك. يمكنك إدارة التفضيلات عبر شريط تعريف الارتباط أو صفحة سياسة ملفات تعريف الارتباط.",
    links: [
      { id: "cookie-policy", url: "/legal/cookie-policy", label: "Cookie Policy", labelAr: "سياسة ملفات تعريف الارتباط" },
    ],
  },
  {
    id: "dmca",
    triggers: ["dmca", "copyright", "takedown", "infringement", "copyright agent"],
    en:
      "DMCA: If you believe content on askterramorph.com infringes your copyright, contact our designated copyright agent at copyright@askterramorph.com. We respond to valid takedown notices.",
    ar:
      "DMCA: إذا كنت تعتقد أن المحتوى على askterramorph.com ينتهك حقوق الطبع والنشر الخاصة بك، اتصل بوكيل حقوق الطبع والنشر المعين لدينا على copyright@askterramorph.com. نرد على إشعارات الإزالة الصالحة.",
    links: [
      { id: "dmca", url: "/legal/dmca-policy", label: "DMCA Policy", labelAr: "سياسة DMCA" },
    ],
  },
  {
    id: "refund",
    triggers: ["refund", "cancellation", "cancel", "money back", "fee", "price"],
    en:
      "Refunds & cancellation: Service-type-specific refund rules apply. You can cancel your subscription with one click — no hidden fees, auto-renewal disclosed 30 days in advance.",
    ar:
      "الإلغاء والاسترداد: قواعد استرداد خاصة بنوع الخدمة تُطبق. يمكنك إلغاء اشتراكك بنقرة واحدة — بدون رسوم مخفية، والتجديد التلقائي يُكشف عنه قبل 30 يومًا.",
    links: [
      { id: "terms", url: "/legal/terms-of-service", label: "Terms of Service", labelAr: "شروط الخدمة" },
    ],
  },
  {
    id: "greeting",
    triggers: ["hi", "hello", "hey", "morpeh", "morphe", "assistant", "help"],
    en:
      "Hi, I'm Morphe — TerraMorph's intake assistant. I can help you understand the G0-G7 gated lifecycle, our services for governments/partners/business/NGOs, case studies, certifications, or get you in touch with the team. What brings you here today?",
    ar:
      "مرحبًا، أنا مورفي — مساعد الاستقبال في شركة تيرامورف. يمكنني مساعدتك في فهم دورة الحياة البواباتية G0-G7، وخدماتنا للحكومات/الشركاء/الأعمال/منظمات المجتمع المدني، ودراسات الحالة، والشهادات، أو التواصل مع الفريق. ماذا يجلبك اليوم؟",
    links: [
      { id: "methodology", url: "/method", label: "G0-G7 Lifecycle", labelAr: "الدورة البواباتية" },
      { id: "services", url: "/for", label: "Services", labelAr: "الخدمات" },
    ],
  },
]

export function findKnowledgeAnswer(text: string, lang: Lang): KnowledgeEntry | null {
  const lower = text.toLowerCase()
  let best: KnowledgeEntry | null = null
  let bestScore = 0

  for (const entry of KNOWLEDGE_BASE) {
    const hits = entry.triggers.filter((t) => lower.includes(t.toLowerCase())).length
    if (hits > bestScore) {
      bestScore = hits
      best = entry
    }
  }

  return bestScore > 0 ? best : null
}
