import "dotenv/config";
import { createApp } from "./app.js";
import { createEmailAdapter } from "./email/factory.js";
import { loadEnv } from "./env.js";
import { prisma } from "./prisma.js";

const env = loadEnv();

const app = createApp({
  prisma,
  email: createEmailAdapter(env),
  env,
});

const server = app.listen(env.PORT, () => {
  console.log(`API listening at ${env.API_ORIGIN}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
