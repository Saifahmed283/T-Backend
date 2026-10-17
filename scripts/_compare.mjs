import {PrismaClient} from '@prisma/client';
const p=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});
const [users,assignments,experts,subs,acts,wms,citems,assets]=await Promise.all([p.user.count(),p.assignment.count(),p.expert.count(),p.submission.count(),p.activityLog.count(),p.workspaceMember.count(),p.contentItem.count(),p.asset.count()]);
console.log({users,assignments,experts,submissions:subs,activityLog:acts,workspaceMember:wms,contentItems:citems,assets});
await p.$disconnect();
