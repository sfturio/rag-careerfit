const { app } = require("./app");
const { env } = require("./config/env");
const { initAnalysisRepository } = require("./repositories/analysis-repository");

async function bootstrap() {
  await initAnalysisRepository();
  app.listen(env.port, () => {
    console.info(`RAGFlow Engine running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start RAGFlow Engine:", error.message);
  process.exit(1);
});
