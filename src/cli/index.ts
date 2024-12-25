// src/cli/index.ts
import { Command } from "commander";
import { setupCommands } from "@/cli/commands";

export function createCLI(): Command {
  const program = new Command()
    .name("linear-cli")
    .description("Linear project management CLI")
    .version("1.0.0");

  setupCommands(program);
  return program;
}
