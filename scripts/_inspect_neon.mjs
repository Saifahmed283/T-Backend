import { PrismaClient } from "@prisma/client";

const url = process.env.NEON_URL;
if (!url) {
  console.error("NEON_URL not set");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const tables = await prisma.$queryRawUnsafe(
    `select table_name from information_schema.tables where table_schema='public' order by table_name`
  );
  console.log("TABLES:", tables.map((t) => t.table_name).join(", "));
  console.log("");
  for (const t of tables) {
    try {
      const c = await prisma.$queryRawUnsafe(`select count(*)::int as n from "${t.table_name}"`);
      console.log(`${t.table_name}: ${c[0].n}`);
    } catch (e) {
      console.log(`${t.table_name}: ERR ${e.message}`);
    }
  }
} finally {
  await prisma.$disconnect();
}
