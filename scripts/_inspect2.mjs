import { PrismaClient } from "@prisma/client";

const url = process.argv[2];
if (!url) {
  console.error("usage: node _inspect2.mjs <url>");
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url } } });

const safe = async (label, fn) => {
  try {
    const r = await fn();
    console.log(`\n== ${label} ==`);
    console.log(JSON.stringify(r, (_k, v) => (typeof v === "bigint" ? Number(v) : v), 2));
  } catch (e) {
    console.log(`\n== ${label} == ERR ${e.message.split("\n")[0]}`);
  }
};

try {
  await safe("workspaces", () =>
    prisma.workspace.findMany({ select: { id: true, name: true, slug: true, createdAt: true } })
  );
  await safe("users", () =>
    prisma.user.findMany({ select: { id: true, email: true, name: true, createdAt: true } })
  );
  await safe("members", () =>
    prisma.workspaceMember.findMany({ select: { workspaceId: true, userId: true, role: true } })
  );
  await safe("assignments", () =>
    prisma.assignment.findMany({
      select: { id: true, name: true, status: true, stage: true, leadId: true, workspaceId: true },
    })
  );
  await safe("experts", () =>
    prisma.expert.findMany({ select: { id: true, name: true, email: true, status: true } })
  );
  await safe("submissions", () =>
    prisma.submission.findMany({
      select: { id: true, kind: true, status: true, email: true, name: true, createdAt: true },
    })
  );
  await safe("siteSettings", () => prisma.siteSetting.findMany({ select: { id: true, workspaceId: true } }));
  await safe("contentItems", () => prisma.contentItem.findMany({ select: { id: true, kind: true, slug: true } }));
  await safe("assets", () => prisma.asset.findMany({ select: { id: true, filename: true } }));
} finally {
  await prisma.$disconnect();
}
