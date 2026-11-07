/**
 * Morphe service - orchestrates classifier, flow engine, sessions, and lead
 * persistence. Persisted leads use the existing Submission table so they are
 * automatically covered by the Data Subject Request pipeline (access/delete/export).
 */
import { prisma } from "../../db/prisma.js";
import { createSubmission } from "../submissions/submissions.service.js";
import { createClassifier } from "./classifier.js";
import { findKnowledgeAnswer, KNOWLEDGE_BASE } from "./knowledge-base.js";
import { FlowEngine } from "./flow.js";
import { morpheSessions } from "./session.js";
import type { FlowSlot } from "./flow.js";

const classifier = createClassifier();

// Flow configuration - mirrors morphe/flow/flow.yaml but with bilingual copy
// and real TerraMorph routes. Edit copy here; no retraining needed for wording changes.
export const FLOW_CONFIG = {
  startState: "greeting",
  states: {
    greeting: {
      say: [
        "Hi, I'm Morphe - TerraMorph's intake assistant. I help turn ideas into leveraged, gated projects. What brings you here today?",
      ],
      sayAr: [
        "أهلاً، أنا مورفي - مساعد الاستقبال في شركة تيرامورف. أساعد في تحويل الأفكار إلى مشاريع بواباتية. ماذا bringsك اليوم؟",
      ],
      expectsSlot: "visitor_type",
      intents: ["new_idea", "partner_inquiry", "general_question", "just_browsing"],
      routes: {
        new_idea: "sector",
        partner_inquiry: "partner_type",
        general_question: "general_qa",
        just_browsing: "soft_close",
        fallback: "clarify_intent",
      },
      suggestLinks: ["methodology", "about"],
    },
    clarify_intent: {
      say: [
        "No worries - just so I point you the right way: are you bringing an idea or initiative, looking to partner with TerraMorph, or do you have a general question?",
      ],
      sayAr: [
        "لا مشكلة - فقط حتى أوجهك بالطريقة الصحيحة: هل تأتي بفكرة أو مبادرة، أم تبحث عن الشراكة مع شركة تيرامورف، أم لديك سؤال عام؟",
      ],
      expectsSlot: "visitor_type",
      intents: ["new_idea", "partner_inquiry", "general_question", "just_browsing"],
      routes: {
        new_idea: "sector",
        partner_inquiry: "partner_type",
        general_question: "general_qa",
        just_browsing: "soft_close",
        fallback: "human_handoff",
      },
      suggestLinks: [],
    },
    sector: {
      say: ["Good - what sector or space is this in? (e.g. education, climate, health, livelihoods, governance...)"],
      sayAr: ["جيد - في أي قطاع أو مجال؟ (مثل التعليم، المناخ، الصحة، سبل العيش، الحوكمة...)"],
      expectsSlot: "sector",
      intents: ["sector_named", "unsure_sector"],
      routes: {
        sector_named: "idea_stage",
        unsure_sector: "idea_stage",
        fallback: "idea_stage",
      },
    },
    idea_stage: {
      say: ["Where is it right now - just a concept, something you've tested informally, or already running with early results?"],
      sayAr: ["أين هو الآن - مجرد فكرة، شيء جربته بشكل غير رسمي، أم يعمل بالفعل بنتائج أولية؟"],
      expectsSlot: "gate_stage",
      intents: ["stage_concept", "stage_tested", "stage_running"],
      routes: {
        stage_concept: "gate_estimate_g0",
        stage_tested: "gate_estimate_g2",
        stage_running: "gate_estimate_g4",
        fallback: "gate_estimate_g0",
      },
    },
    gate_estimate_g0: {
      say: ["That puts you around G0 - the ignition gate, where TerraMorph helps shape raw ideas into a structured case."],
      sayAr: ["هذا يضعك عند بوابة G0 - بوابة الإشعال، حيث تساعد شركة تيرامورف في تشكيل الأفكار الخام إلى حالة منظمة."],
      expectsSlot: null,
      autoNext: "timeline",
      suggestLinks: ["methodology"],
    },
    gate_estimate_g2: {
      say: ["That's roughly G2 territory - you've got early validation, and the next gate is about proving the model can scale responsibly."],
      sayAr: ["هذا يشبه منطقة G2 - لديك التحقق المبكر، والبوابة التالية هي حول إثبات أن النموذج يمكن أن يتوسع بشكل مسؤول."],
      expectsSlot: null,
      autoNext: "timeline",
      suggestLinks: ["methodology", "case_studies"],
    },
    gate_estimate_g4: {
      say: ["That's solid - sounds like G4+, where the focus shifts to leverage: partnerships, funding structure, and governance for scale."],
      sayAr: ["هذا قوي - يبدو مثل G4+، حيث يتحول التركيز إلى الرافعة: الشراكات، هيكل التمويل، والحوكمة للتوسع."],
      expectsSlot: null,
      autoNext: "timeline",
      suggestLinks: ["methodology", "case_studies", "partners"],
    },
    timeline: {
      say: ["What's your timeline - are you hoping to move on this in the next month, this quarter, or is it more exploratory for now?"],
      sayAr: ["ما هو جدولك الزمني - هل تأمل في التقدم في هذا خلال الشهر القادم، هذا الربع، أم أنه أكثر استكشافًا الآن؟"],
      expectsSlot: "timeline",
      intents: ["timeline_urgent", "timeline_quarter", "timeline_exploratory"],
      routes: {
        timeline_urgent: "contact_capture",
        timeline_quarter: "contact_capture",
        timeline_exploratory: "contact_capture",
        fallback: "contact_capture",
      },
    },
    contact_capture: {
      say: ["Got it. Last step - who should our team follow up with? Your name, email, and the best way to reach you."],
      sayAr: ["فهمت. الخطوة الأخيرة - مع من يجب أن يتابع فريقنا؟ اسمك، بريدك الإلكتروني، وأفضل طريقة للوصول إليك."],
      expectsSlot: "contact_info",
      intents: ["contact_given", "contact_declined"],
      routes: {
        contact_given: "handoff_summary",
        contact_declined: "soft_close",
        fallback: "contact_capture_retry",
      },
    },
    contact_capture_retry: {
      say: ["No problem if you'd rather not share details right now - but if you want someone from TerraMorph to actually follow up, I'll need at least a name and email."],
      sayAr: ["لا مشكلة إذا كنت تفضل عدم مشاركة التفاصيل الآن - ولكن إذا كنت تريد شخصًا من شركة تيرامورف لمتابعة فعليًا، سأحتاج إلى اسم وبريد إلكتروني على الأقل."],
      expectsSlot: "contact_info",
      intents: ["contact_given", "contact_declined"],
      routes: {
        contact_given: "handoff_summary",
        contact_declined: "soft_close",
        fallback: "soft_close",
      },
    },
    partner_type: {
      say: ["Great - are you looking to partner as a funder, a government/development partner, a consultancy, or something else?"],
      sayAr: ["رائع - هل تبحث عن الشراكة كممول، أو شريك حكومي/تنموي، أو استشاري، أو شيء آخر؟"],
      expectsSlot: "partner_category",
      intents: ["partner_named", "unsure_partner"],
      routes: {
        partner_named: "contact_capture",
        unsure_partner: "contact_capture",
        fallback: "contact_capture",
      },
      suggestLinks: ["partners"],
    },
    general_qa: {
      say: ["Happy to help - ask away about TerraMorph, the G0-G7 methodology, or how 'Leverage For Good' works in practice."],
      sayAr: ["سعيد بالمساعدة - اسأل عما تريد عن شركة تيرامورف، أو منهجية G0-G7، أو كيف يعمل 'الرافعة للخير' عمليًا."],
      expectsSlot: "free_question",
      intents: ["question_methodology", "question_services", "question_about", "question_partners", "question_contact", "done_asking"],
      routes: {
        question_methodology: "general_qa",
        question_services: "general_qa",
        question_about: "general_qa",
        question_partners: "general_qa",
        question_contact: "general_qa",
        done_asking: "soft_close",
        fallback: "human_handoff",
      },
      suggestLinks: ["methodology", "services", "about"],
      intentReplies: {
        question_methodology: "TerraMorph uses a gated lifecycle, G0 through G7 - each gate is a checkpoint where an idea has to prove it's ready to advance, from raw concept at G0 to full leveraged scale by G7.",
        question_services: "TerraMorph works as a strategy, policy, and transformation advisory - shaping ideas into structured, fundable cases and guiding them through the gated process.",
        question_about: "TerraMorph is a Cairo-based social cause incubation company - there's also TerraMorph Society, the community-facing side.",
        question_partners: "Partnerships take a few shapes - funders, government/development partners, and consultancies all plug in differently.",
        question_contact: "The fastest way is the contact page below - or tell me a bit about what you need and I can log it for the team directly.",
      },
      intentRepliesAr: {
        question_methodology: "تستخدم شركة تيرامورف دورة حياة بواباتية، من G0 إلى G7 - كل بوابة هي نقطة تفتيش حيث يجب أن تثبت الفكرة جاهزيتها للتقدم، من الفكرة الخام عند G0 إلى كامل الوتيرة المُضاعفة عند G7.",
        question_services: "تعمل شركة تيرامورف كاستشاري استراتيجية، وسياسة، وتحول - تشكيل الأفكار إلى حالات منظمة، وقابلة للتمويل، وتوجيهها خلال العملية البواباتية.",
        question_about: "شركة تيرامورف هي شركة حاضنة للأسباب الاجتماعية مقرها القاهرة - وهناك أيضًا شركة تيرامورف للمجتمع، الجانب المجتمعي.",
        question_partners: "تأتي الشراكات بأشكال قليلة - ممولون، وشركاء حكوميون/تنمويون، واستشاريون، جميعهم يتصلون بشكل مختلف.",
        question_contact: "أسرع طريقة هي صفحة الاتصال أدناه - أو أخبرني ببعض ما تحتاج إليه وسأقوم بتسجيله للفريق مباشرة.",
      },
    },
    handoff_summary: {
      say: ["Perfect - I've logged this for the TerraMorph team and someone will reach out soon. Thanks for sharing your idea with us."],
      sayAr: ["ممتاز - لقد قمت بتسجيل هذا لفريق شركة تيرامورف وسيتصل بك أحدهم قريبًا. شكرًا على مشاركة فكرتك معنا."],
      terminal: true,
      suggestLinks: ["case_studies"],
    },
    soft_close: {
      say: ["All good - feel free to come back any time you're ready to talk through an idea. Have a great day."],
      sayAr: ["كل شيء على ما يرام - لا تتردد في العودة في أي وقت تكون مستعدًا فيه للتحدث عن فكرة. يومك سعيد."],
      terminal: true,
      suggestLinks: ["about", "society"],
    },
    human_handoff: {
      say: ["That's outside what I can help with directly - let me flag this for a member of the TerraMorph team to follow up with you personally."],
      sayAr: ["هذا خارج ما يمكنني مساعدتك فيه مباشرة - دعني أرصد هذا لأحد أعضاء فريق شركة تيرامورف لمتابعتك شخصيًا."],
      terminal: true,
      suggestLinks: ["contact"],
    },
  },
} as const;

export const FLOW_LINKS: Record<string, { url: string; label: string; labelAr?: string }> = {
  methodology: { url: "/method", label: "The G0-G7 Gated Lifecycle", labelAr: "دورة الحياة البواباتية G0-G7" },
  services: { url: "/for", label: "Advisory Services", labelAr: "خدمات الاستشارات" },
  about: { url: "/about", label: "About TerraMorph", labelAr: "عن شركة تيرامورف" },
  partners: { url: "/hub/development-partners", label: "Partnership Models", labelAr: "نماذج الشراكة" },
  case_studies: { url: "/evidence/case-studies", label: "Case Studies", labelAr: "دراسات الحالة" },
  contact: { url: "/contact", label: "Contact the Team", labelAr: "تواصل مع الفريق" },
  society: { url: "/about", label: "TerraMorph Society", labelAr: "مجتمع شركة تيرامورف" },
};

export interface ChatInput {
  sessionId: string | null;
  message: string | null;
  lang: "en" | "ar";
}

export interface ChatOutput {
  sessionId: string;
  reply: string;
  state: string;
  terminal: boolean;
  slots: FlowSlot;
  links: Array<{ id: string; url: string; label: string }>;
}

export async function handleChat(input: ChatInput): Promise<ChatOutput> {
  const lang = input.lang ?? "en";

  // Resolve or create session
  let sessionId: string = input.sessionId ?? crypto.randomUUID();
  let rec = morpheSessions.get(sessionId);
  if (!rec) {
    sessionId = crypto.randomUUID();
    morpheSessions.create(sessionId, lang);
    rec = morpheSessions.get(sessionId);
    if (!rec) throw new Error("Failed to create Morphe session");
  }

  // If the user sent a message, check the knowledge base first.
  // Knowledge questions are answered directly without advancing the flow
  // state, so asking "what is G2?" mid-conversation won't derail intake.
  if (input.message) {
    const kb = findKnowledgeAnswer(input.message, lang)
    if (kb) {
      return {
        sessionId,
        reply: lang === "ar" ? kb.ar : kb.en,
        state: rec.state,
        terminal: false,
        slots: rec.slots,
        links: (kb.links ?? []).map((l) => ({ id: l.id, url: l.url, label: l.label })),
      }
    }
  }

  const engine = new FlowEngine(classifier, FLOW_CONFIG, FLOW_LINKS);
  const result = engine.step(rec, input.message ?? null, lang);

  // Persist session state
  morpheSessions.set(sessionId, {
    state: result.state,
    slots: result.slots,
    lang,
    history: rec.history,
    createdAt: rec.createdAt,
    lastAccessed: Date.now(),
  });

  // On terminal handoff with contact info, persist as a lead Submission.
  // Non-blocking: a chat must never fail because lead persistence failed.
  if (result.terminal && (result.slots.email || result.slots.name)) {
    void captureLead(result.slots, sessionId, lang).catch((err) => {
      console.error("Morphe lead persistence failed:", err);
    });
  }

  return {
    sessionId,
    reply: result.reply,
    state: result.state,
    terminal: result.terminal,
    slots: result.slots,
    links: result.links.map((l) => ({ id: l.id, url: l.url, label: l.label })),
  };
}

async function captureLead(slots: FlowSlot, sessionId: string, lang: "en" | "ar"): Promise<void> {
  const payload: Record<string, unknown> = {
    source: "morphe",
    sessionId,
    lang,
    sector: slots.sector,
    stage: slots.stage,
    timeline: slots.timeline,
    partnerCategory: slots.partnerCategory,
    visitorType: slots.visitorType,
    rawContactText: slots.rawContactText,
  };

  await createSubmission({
    kind: "MORPHE_LEAD",
    email: slots.email ?? undefined,
    name: slots.name ?? undefined,
    message: slots.rawContactText ?? undefined,
    source: "morphe",
    payload,
  });
}

export async function getHealth() {
  return {
    status: "ok",
    service: "morphe",
    model: classifier.constructor.name,
    intents: classifier.labels.length,
    sessions: morpheSessions.size(),
  };
}
