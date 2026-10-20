import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.argv[2];
const tables = process.argv.slice(3);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

try {
  for (const t of tables) {
    try {
      const rows = await prisma.$queryRawUnsafe(`select * from "${t}"`);
      console.log(`\n===== ${t} (${rows.length}) =====`);
      console.log(JSON.stringify(rows, (_k, v) => (typeof v === "bigint" ? Number(v) : v), 2));
    } catch (e) {
      console.log(`\n===== ${t} ===== ERR ${e.message.split("\n")[0]}`);
    }
  }
} finally {
  await prisma.$disconnect();
}
