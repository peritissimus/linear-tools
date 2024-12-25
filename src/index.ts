// src/index.ts
import { createCLI } from "@/cli";

async function main() {
  const program = createCLI();
  await program.parseAsync();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
