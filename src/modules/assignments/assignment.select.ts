export const assignmentSelect = {
  id: true,
  name: true,
  client: true,
  sector: true,
  value: true,
  status: true,
  stage: true,
  lead: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const