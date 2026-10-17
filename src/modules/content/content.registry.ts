// Content schemas describe the fields an editor renders, not website content or
// sample records. The frontend ships an identical copy at
// src/pages/workspace/content-model.ts; keep the two in step.
export type FieldType = 'text' | 'textarea' | 'url' | 'date' | 'number'

export type FieldDefinition = {
  key: string
  label: string
  type?: FieldType
  required?: boolean
  localized?: boolean
  hint?: string
}

export type Collection = {
  id: string
  name: string
  singular: string
  description: string
  group: string
  fields: FieldDefinition[]
}

const title: FieldDefinition = { key: 'title', label: 'Title', required: true, localized: true }
const description: FieldDefinition = { key: 'description', label: 'Description', type: 'textarea', localized: true }
const text = (key: string, label: string, localized = false): FieldDefinition => ({ key, label, type: 'textarea', localized })

export const collections: Collection[] = [
  {
    id: 'assignments',
    name: 'Assignments',
    singular: 'Assignment',
    description: 'Client mandates and delivery records',
    group: 'Evidence',
    fields: [
      title,
      { key: 'client', label: 'Client', required: true },
      { key: 'clientType', label: 'Client type' },
      { key: 'year', label: 'Year', type: 'number' },
      { key: 'role', label: 'Role' },
      { key: 'geography', label: 'Geography' },
      { key: 'sector', label: 'Sector' },
      { key: 'domain', label: 'LDIA domain' },
      { key: 'valueBand', label: 'Value band', hint: 'Internal only. Not shown on the public page.' },
      description,
      { key: 'reference', label: 'Reference' },
      { key: 'verification', label: 'Verification URL', type: 'url' },
    ],
  },
  {
    id: 'cases',
    name: 'Case Studies',
    singular: 'Case Study',
    description: 'Evidence of work and measurable change',
    group: 'Evidence',
    fields: [
      title,
      { key: 'client', label: 'Client', required: true },
      { ...text('mandate', 'Mandate', true), required: true },
      text('constraint', 'Constraint', true),
      { ...text('whatWeDid', 'What we did', true), required: true },
      text('whatChanged', 'What changed', true),
      text('measurement', 'How it was measured', true),
      { key: 'whoToAsk', label: 'Who to ask', hint: 'Only share contact details with explicit consent.' },
      { key: 'verification', label: 'Verification URL', type: 'url' },
    ],
  },
  {
    id: 'publications',
    name: 'Publications',
    singular: 'Publication',
    description: 'Research, policy briefs and working papers',
    group: 'Knowledge',
    fields: [
      title,
      description,
      { key: 'author', label: 'Author' },
      { key: 'publicationDate', label: 'Publication date', type: 'date' },
      { key: 'contentType', label: 'Content type' },
      { key: 'domain', label: 'LDIA domain' },
      { key: 'sector', label: 'Sector' },
      { key: 'geography', label: 'Geography' },
      { key: 'reference', label: 'External reference', type: 'url' },
      text('citation', 'Citation'),
      text('bibtex', 'BibTeX'),
      { key: 'license', label: 'License' },
      { key: 'tags', label: 'Tags', hint: 'Separate tags with commas.' },
    ],
  },
  {
    id: 'instruments',
    name: 'Instruments',
    singular: 'Instrument',
    description: 'Frameworks, methods and practical tools',
    group: 'Knowledge',
    fields: [
      { ...title, label: 'Name' },
      description,
      { key: 'domain', label: 'LDIA domain' },
      { key: 'stage', label: 'G-stage' },
      text('whatItIs', 'What it is', true),
      text('whenToUse', 'When to use it', true),
      text('produces', 'What it produces', true),
      { key: 'license', label: 'License' },
      text('citation', 'Citation'),
      text('bibtex', 'BibTeX'),
      text('usedBy', 'Who has used it'),
    ],
  },
  {
    id: 'courses',
    name: 'Courses',
    singular: 'Course',
    description: 'Learning programmes and opportunities',
    group: 'Knowledge',
    fields: [
      title,
      description,
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'booking', label: 'Booking link', type: 'url' },
    ],
  },
  {
    id: 'experts',
    name: 'Experts',
    singular: 'Expert',
    description: 'Expert profiles and areas of expertise',
    group: 'Network',
    fields: [
      { ...title, label: 'Name' },
      { ...description, label: 'Biography' },
      { key: 'expertise', label: 'Expertise' },
      { key: 'geography', label: 'Geography' },
    ],
  },
  {
    id: 'partners',
    name: 'Partners',
    singular: 'Partner',
    description: 'Organisations and delivery partnerships',
    group: 'Network',
    fields: [
      { ...title, label: 'Organisation' },
      description,
      { key: 'country', label: 'Country' },
      { key: 'sectors', label: 'Sectors' },
      { key: 'languages', label: 'Languages' },
      text('capabilities', 'Capability statement'),
    ],
  },
  {
    id: 'vacancies',
    name: 'Vacancies',
    singular: 'Vacancy',
    description: 'Open positions and opportunities',
    group: 'Network',
    fields: [
      title,
      description,
      { key: 'deadline', label: 'Application deadline', type: 'date' },
    ],
  },
  {
    id: 'initiatives',
    name: 'Initiatives',
    singular: 'Initiative',
    description: 'Programmes and ongoing initiatives',
    group: 'Evidence',
    fields: [title, description],
  },
  {
    id: 'audiences',
    name: 'Audience Hubs',
    singular: 'Audience Hub',
    description: 'Reusable pages for seven audiences',
    group: 'Website',
    fields: [
      { ...title, label: 'Name' },
      { key: 'heading', label: 'Heading', localized: true },
      text('standfirst', 'Standfirst', true),
      text('questions', 'Questions', true),
      { key: 'cta', label: 'Call to action', localized: true },
      { key: 'contactPerson', label: 'Contact person' },
      { key: 'booking', label: 'Booking link', type: 'url' },
    ],
  },
  {
    id: 'stages',
    name: 'G0–G7 Stages',
    singular: 'Stage',
    description: 'Structured stages of the TerraMorph method',
    group: 'Knowledge',
    fields: [
      { ...title, label: 'Name' },
      description,
      { key: 'order', label: 'Order', type: 'number' },
    ],
  },
]

export const collectionIds = collections.map((collection) => collection.id)

export type CollectionId = (typeof collections)[number]['id']

const byId = new Map(collections.map((collection) => [collection.id, collection]))

export function collectionById(id: string): Collection | undefined {
  return byId.get(id)
}

// Collection id -> Prisma ContentKind. The two are deliberately separate so the
// URL/editor vocabulary can change without rewriting stored rows.
export const kindByCollectionId: Record<string, string> = {
  assignments: 'ASSIGNMENT',
  cases: 'CASE',
  publications: 'PUBLICATION',
  instruments: 'INSTRUMENT',
  courses: 'COURSE',
  experts: 'EXPERT',
  partners: 'PARTNER',
  vacancies: 'VACANCY',
  initiatives: 'INITIATIVE',
  audiences: 'AUDIENCE',
  stages: 'STAGE',
}

export const collectionIdByKind: Record<string, string> = Object.fromEntries(
  Object.entries(kindByCollectionId).map(([id, kind]) => [kind, id]),
)

export function kindForCollectionId(id: string): string | undefined {
  return kindByCollectionId[id]
}
