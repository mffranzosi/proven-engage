import { PrismaClient, StageType } from "@prisma/client";

const prisma = new PrismaClient();

const ENGAGEMENT_STAGES = [
  "Cold outreach",
  "First reply",
  "First call",
  "Product demo",
  "Negotiation",
  "Deal",
];

const AWARENESS_STAGES = [
  "Unaware",
  "Problem aware",
  "Solution aware",
  "Product aware",
];

async function seedStages(names: string[], type: StageType) {
  for (let i = 0; i < names.length; i++) {
    await prisma.stage.upsert({
      where: { type_order: { type, order: i } },
      update: { name: names[i] },
      create: { name: names[i], order: i, type },
    });
  }
}

async function main() {
  await seedStages(ENGAGEMENT_STAGES, StageType.ENGAGEMENT);
  await seedStages(AWARENESS_STAGES, StageType.AWARENESS);
  console.log("Seeded default stages.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
