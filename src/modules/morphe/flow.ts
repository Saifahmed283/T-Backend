/**
 * Morphe dialogue flow engine - ported from flow/engine.py.
 * Deterministic state machine driven by a YAML-like config, with contextual
 * intent masking so the classifier only ever chooses among valid intents.
 */
import type { MorpheClassifier } from "./classifier.js";

export type Lang = "en" | "ar";

export interface FlowLink {
  id: string;
  url: string;
  label: string;
  labelAr?: string;
}

export interface FlowSlot {
  email?: string;
  phone?: string;
  name?: string;
  sector?: string;
  stage?: string;
  timeline?: string;
  partnerCategory?: string;
  visitorType?: string;
  rawContactText?: string;
  [key: string]: unknown;
}

export interface FlowState {
  say: readonly string[];
  sayAr?: readonly string[];
  intentReplies?: Record<string, string>;
  intentRepliesAr?: Record<string, string>;
  expectsSlot?: string | null;
  intents?: readonly string[];
  routes?: Record<string, string>;
  autoNext?: string;
  terminal?: boolean;
  suggestLinks?: readonly string[];
}

export interface FlowConfig {
  startState: string;
  states: Record<string, FlowState>;
}

export interface FlowStepResult {
  reply: string;
  state: string;
  terminal: boolean;
  slots: FlowSlot;
  links: FlowLink[];
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d -]{7,}\d)/;

// Specific question intents resolve to a specific page, on top of
// whatever a state's own "suggest_links" already offers.
const INTENT_LINK_MAP: Record<string, string> = {
  question_methodology: "methodology",
  question_services: "services",
  question_about: "about",
  question_partners: "partners",
  question_contact: "contact",
};

export class FlowEngine {
  private classifier: MorpheClassifier;
  private flow: FlowConfig;
  private links: Record<string, { url: string; label: string; labelAr?: string }>;

  constructor(
    classifier: MorpheClassifier,
    flow: FlowConfig,
    links: Record<string, { url: string; label: string; labelAr?: string }>,
  ) {
    this.classifier = classifier;
    this.flow = flow;
    this.links = links;
  }

  static newSession(startState: string) {
    return {
      state: startState,
      slots: {} as FlowSlot,
      history: [] as Array<{ state: string; text: string | null; intent: string | null }>,
    };
  }

  private resolveLinks(linkIds: readonly string[] | undefined, lang: Lang): FlowLink[] {
    const resolved: FlowLink[] = [];
    const seen = new Set<string>();
    for (const lid of linkIds ?? []) {
      if (lid in this.links && !seen.has(lid)) {
        seen.add(lid);
        const l = this.links[lid];
        resolved.push({ id: lid, url: l.url, label: lang === "ar" && l.labelAr ? l.labelAr : l.label, labelAr: l.labelAr });
      }
    }
    return resolved;
  }

  private extractContact(text: string): Partial<FlowSlot> {
    const slot: Partial<FlowSlot> = {};
    const email = EMAIL_RE.exec(text);
    const phone = PHONE_RE.exec(text);
    // Also capture a naive name: first capitalized word sequence near "I'm" / "name is"
    if (email) slot.email = email[0];
    if (phone) slot.phone = phone[1].trim();
    return slot;
  }

  step(session: ReturnType<typeof FlowEngine.newSession>, userText: string | null, lang: Lang = "en"): FlowStepResult {
    const stateName = session.state;
    const state = this.flow.states[stateName];
    if (!state) throw new Error(`Unknown flow state: ${stateName}`);

    let lastIntent: string | null = null;

    if (userText !== null) {
      const allowed = state.intents ?? [];
      let intent = "fallback";
      if (allowed.length > 0) {
        const top = this.classifier.predict(userText, allowed, 1);
        intent = top[0]?.intent ?? "fallback";
      }
      lastIntent = intent;

      session.history.push({ state: stateName, text: userText, intent });

      const expects = state.expectsSlot ?? null;
      if (expects) {
        if (expects === "contact_info") {
          const extracted = this.extractContact(userText);
          Object.assign(session.slots, extracted);
          session.slots.rawContactText = userText;
          // Flow-level override: if we extracted contact info, treat as contact_given
          // regardless of classifier output. The classifier can misclassify
          // "name@email.com" as a general question.
          if (extracted.email || extracted.phone) {
            intent = "contact_given";
          }
        } else {
          session.slots[expects] = userText;
        }
      }

      const routes = state.routes ?? {};
      const nextStateName = routes[intent] ?? routes["fallback"] ?? stateName;
      session.state = nextStateName;
      const nextState = this.flow.states[nextStateName];
      if (!nextState) throw new Error(`Unknown flow state: ${nextStateName}`);
      // Replace state reference for auto-advance below
      // (we reassign stateName and fall through)
      // state = nextState; // not needed, we use session.state below
    }

    // Auto-advance through states with no question (e.g. layer commentary)
    let currentState = this.flow.states[session.state];
    while (currentState.autoNext && !currentState.terminal) {
      const replyLine = this.pickSay(currentState, lang);
      session.history.push({ state: session.state, text: null, intent: null });
      session.slots._pendingLines = [...(session.slots._pendingLines as string[] ?? []), replyLine];
      session.state = currentState.autoNext;
      currentState = this.flow.states[session.state];
    }

    const pending = (session.slots._pendingLines as string[] ?? []).slice();
    delete session.slots._pendingLines;

    const intentReplies = lang === "ar" ? state.intentRepliesAr ?? state.intentReplies : state.intentReplies;
    let baseReply: string;
    if (lastIntent && intentReplies && lastIntent in intentReplies) {
      baseReply = intentReplies[lastIntent] ?? "";
    } else if (currentState.say) {
      baseReply = this.pickSay(currentState, lang);
    } else {
      baseReply = "";
    }

    const reply = pending.length > 0 && baseReply ? [...pending, baseReply].join(" ") : pending.join(" ") || baseReply;

    const linkIds = [...(currentState.suggestLinks ?? [])];
    if (lastIntent && lastIntent in INTENT_LINK_MAP) {
      linkIds.unshift(INTENT_LINK_MAP[lastIntent]);
    }

    return {
      reply,
      state: session.state,
      terminal: Boolean(currentState.terminal),
      slots: session.slots,
      links: this.resolveLinks(linkIds, lang),
    };
  }

  private pickSay(state: FlowState, lang: Lang): string {
    const say = lang === "ar" && state.sayAr ? state.sayAr : state.say;
    if (!say || say.length === 0) return "";
    return say[Math.floor(Math.random() * say.length)];
  }
}
