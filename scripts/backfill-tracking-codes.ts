import { prisma } from "../lib/prisma";
import { generateTrackingCode } from "../lib/events";

async function main() {
  const incidents = await prisma.incident.findMany({
    where: { trackingCode: null },
  });

  console.log(`Backfilling tracking codes for ${incidents.length} incidents...`);
  const usedCodes = new Set(
    (await prisma.incident.findMany({ select: { trackingCode: true } }))
      .map((i) => i.trackingCode)
      .filter(Boolean)
  );

  for (const inc of incidents) {
    let code = generateTrackingCode();
    while (usedCodes.has(code)) {
      code = generateTrackingCode();
    }
    usedCodes.add(code);

    await prisma.incident.update({
      where: { id: inc.id },
      data: { trackingCode: code },
    });
    console.log(`Updated incident ${inc.id} with trackingCode: ${code}`);
  }

  console.log("Backfill complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

