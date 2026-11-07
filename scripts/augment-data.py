"""
Augment Morphe's training data with more phrasing variants per intent.
Run: python scripts/augment_data.py
Then retrain: python scripts/train.py
Then convert: python scripts/convert-morphe-model.py
"""
import json
import os
import random

DATA_PATH = os.path.join("C:", os.sep, "My-Projects", "Terramorph", "T-Morphe", "morphe", "data", "train.jsonl")

random.seed(42)

# Additional training examples per intent
ADDITIONS = {
    "new_idea": [
        "I want to pitch a new initiative",
        "my organization has a project idea",
        "we're launching a community program",
        "I've designed a social enterprise concept",
        "there's a gap I want to fill with a project",
        "I have a proposal for a development initiative",
        "we want to start something new in our village",
        "I'm building a pilot program",
        "my team has a concept we want to develop",
        "I want to submit a project for incubation",
        "we have a rough idea and need structure",
        "I'm working on a grassroots initiative",
        "our community needs a new program",
        "I want to turn my idea into a real project",
        "we're drafting a concept note for funding",
        "I have a solution for a local problem",
        "my startup is in the very early stage",
        "we want to incubate a social venture",
        "I've been thinking about launching something",
        "there's an opportunity I want to pursue",
    ],
    "sector_named": [
        "it's in the education space",
        "we work in healthcare access",
        "the focus is climate resilience",
        "agriculture and food security",
        "livelihoods and job creation",
        "youth empowerment and skills training",
        "civic engagement and governance",
        "financial inclusion for underserved areas",
        "women's economic participation",
        "refugee and displacement support",
        "renewable energy projects",
        "water and sanitation programs",
        "education technology for rural schools",
        "primary healthcare clinics",
        "smallholder farmer support",
    ],
    "partner_inquiry": [
        "we want to fund projects like yours",
        "our foundation is looking for partners",
        "I represent a development agency",
        "we're a consultancy wanting to collaborate",
        "our NGO wants to partner with TerraMorph",
        "we're investors in social enterprises",
        "can we explore a partnership model?",
        "our government ministry wants to collaborate",
        "we want to co-create a program",
        "looking for strategic alliance opportunities",
        "our company has CSR funds to deploy",
        "we want to sponsor a community initiative",
        "are you open to funding partnerships?",
        "we're a bilateral donor agency",
        "I'm from a venture philanthropy fund",
    ],
    "general_question": [
        "what does TerraMorph do exactly?",
        "can you explain your services?",
        "how does the company work?",
        "what's your mission?",
        "who are your clients?",
        "what regions do you operate in?",
        "is TerraMorph a nonprofit or company?",
        "what kind of projects do you support?",
        "how long has TerraMorph been around?",
        "what makes your approach different?",
        "do you work with international partners?",
        "what's your geographic focus?",
        "can anyone apply for support?",
        "what's your track record?",
        "how do you select projects?",
    ],
    "just_browsing": [
        "just looking around",
        "checking out the website",
        "browsing for now",
        "exploring what you offer",
        "not sure yet, just curious",
        "kicking the tires",
        "seeing what's available",
        "just window shopping",
        "no commitment, just looking",
        "gathering initial information",
    ],
    "contact_given": [
        "you can reach me at sarah@ngo.org",
        "my email is omar@startup.com",
        "call me at +20 123 456 7890",
        "here's my contact: leila@foundation.eg",
        "reach out to me at info@myorg.org",
        "my phone is 01098765432",
        "email me at contact@group.com",
        "you can call +20 111 222 3333",
        "my details: dr.eman@clinic.health",
        "please email project@venture.org",
    ],
    "contact_declined": [
        "I'd rather not share my details",
        "no, I prefer to stay anonymous",
        "I don't want to give my email",
        "skip the contact part",
        "not comfortable sharing phone",
        "I'd rather not",
        "keep it general, no contact info",
        "I prefer not to disclose",
        "no thanks on the details",
        "I'll pass on sharing my information",
    ],
    "done_asking": [
        "that's all I needed to know",
        "thanks, I'm done",
        "that covers everything",
        "no more questions for now",
        "that's sufficient, thank you",
        "I'm all set",
        "thanks for the info",
        "nothing else, goodbye",
        "that answers my questions",
        "I'm good for now",
    ],
    "unsure_sector": [
        "I'm not sure which sector",
        "it spans multiple areas",
        "haven't decided on a sector yet",
        "could be education or health",
        "not sure where it fits",
        "it's cross-cutting",
        "undecided on the focus area",
        "might be a few sectors",
        "I need help categorizing it",
        "not certain about the domain",
    ],
    "stage_concept": [
        "just a concept on paper",
        "very early stage, just an idea",
        "nothing built yet",
        "pre-concept phase",
        "just started thinking about it",
        "idea stage only",
        "nothing implemented yet",
        "still in the planning phase",
        "raw concept, no validation",
        "just a napkin sketch really",
    ],
    "stage_tested": [
        "we ran a small pilot",
        "tested informally with a few users",
        "done a prototype and got feedback",
        "early validation complete",
        "ran a trial with two communities",
        "pilot phase finished",
        "tested with a small group",
        "initial results look promising",
        "we've done some informal testing",
        "proof of concept exists",
    ],
    "stage_running": [
        "already operating with users",
        "live and generating impact",
        "running for two years now",
        "already in the market",
        "active program with beneficiaries",
        "fully operational",
        "serving customers currently",
        "business is up and running",
        "project is live in the field",
        "already scaled to multiple sites",
    ],
    "timeline_urgent": [
        "need to start immediately",
        "as soon as possible",
        "very urgent timeline",
        "within the next few weeks",
        "rushing to launch",
        "need this done fast",
        "immediate start preferred",
        "time is critical",
        "we need to move quickly",
        "ASAP is our timeline",
    ],
    "timeline_quarter": [
        "within the next three months",
        "this quarter",
        "Q2 timeline",
        "within 3-6 months",
        "planning to start soon",
        "within the next quarter",
        "targeting launch in three months",
        "short-term timeline",
        "within 90 days",
        "aiming for this quarter",
    ],
    "timeline_exploratory": [
        "just exploring options",
        "no specific timeline yet",
        "sometime in the future",
        "still figuring out timing",
        "not in a rush",
        "long-term horizon",
        "when the time is right",
        "flexible on timing",
        "no deadline set",
        "whenever we're ready",
    ],
    "partner_named": [
        "we're a funder",
        "government development partner",
        "our consultancy wants to partner",
        "we're an NGO",
        "bilateral agency",
        "private foundation",
        "we're investors",
        "multilateral organization",
        "we're a corporate partner",
        "development bank",
    ],
    "unsure_partner": [
        "not sure what kind of partner",
        "haven't decided on partnership type",
        "open to different models",
        "not certain about our role",
        "still exploring partnership options",
        "undecided on partner category",
        "could be several types",
        "need guidance on partnership structure",
        "not sure which model fits",
        "still thinking about it",
    ],
    "question_methodology": [
        "how does the gate system work?",
        "explain the G0-G7 lifecycle",
        "what are the gates in your methodology?",
        "how does TerraMorph's process work?",
        "what's the gated approach?",
        "explain gate G0 to G7",
        "how do ideas progress through your system?",
        "what's the lifecycle framework?",
        "how does leverage for good work?",
        "what's your methodology for incubation?",
    ],
    "question_services": [
        "what services do you offer?",
        "what does your advisory include?",
        "do you provide strategy support?",
        "what kind of transformation work?",
        "do you help with policy?",
        "what's in your service portfolio?",
        "do you offer incubation?",
        "what advisory services are available?",
        "do you help with fundraising?",
        "what support do you provide to projects?",
    ],
    "question_about": [
        "tell me about TerraMorph",
        "who founded the company?",
        "where is TerraMorph based?",
        "what's the organization's story?",
        "is TerraMorph Egyptian?",
        "who runs TerraMorph?",
        "what's the background of the company?",
        "tell me about your team",
        "when was TerraMorph established?",
        "what's the organization's focus?",
    ],
    "question_partners": [
        "who are your partners?",
        "what partnership models exist?",
        "do you work with funders?",
        "how do partnerships work?",
        "who do you collaborate with?",
        "what kinds of organizations partner with you?",
        "do you have government partners?",
        "are there corporate partnerships?",
        "how can organizations partner with TerraMorph?",
        "what's your partner network?",
    ],
    "question_contact": [
        "how do I contact the team?",
        "what's the best way to reach you?",
        "where is your office?",
        "do you have a contact email?",
        "how can I speak with someone?",
        "what's your phone number?",
        "where are you located?",
        "how do I get in touch?",
        "do you have a contact form?",
        "who should I email?",
    ],
}

# Load existing rows
existing_rows = []
existing_texts = set()
with open(DATA_PATH, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            row = json.loads(line)
            existing_rows.append(row)
            existing_texts.add(row["text"])

# Add new examples
new_rows = []
for intent, examples in ADDITIONS.items():
    for text in examples:
        if text not in existing_texts:
            new_rows.append({"text": text, "intent": intent})
            existing_texts.add(text)

# Append to file
with open(DATA_PATH, "a", encoding="utf-8") as f:
    for row in new_rows:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")

print(f"Added {len(new_rows)} new examples")
print(f"Total rows now: {len(existing_rows) + len(new_rows)}")

# Show distribution
from collections import Counter
all_rows = existing_rows + new_rows
c = Counter(r["intent"] for r in all_rows)
for k, v in sorted(c.items(), key=lambda x: -x[1]):
    print(f"  {k:25s} {v:3d}")
