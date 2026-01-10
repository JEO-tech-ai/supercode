import { createSuperCoin } from "../src/supercoin";
import { SuperCoinConfigSchema } from "../src/config/schema";

async function main() {
  console.log("=".repeat(60));
  console.log("SuperCoin Sample Application - Agent 활용 데모");
  console.log("=".repeat(60));
  console.log();

  const config = SuperCoinConfigSchema.parse({
    default_model: "anthropic/claude-sonnet-4",
    fallback_models: ["openai/gpt-4o", "google/gemini-2.0-flash"],
  });

  const supercoin = createSuperCoin(config, process.cwd());

  await supercoin.initialize();

  console.log("1. 모델 목록 조회");
  console.log("-".repeat(40));
  const models = supercoin.models.listModels();
  console.log(`총 ${models.length}개 모델 사용 가능:\n`);

  const byProvider = {
    anthropic: models.filter((m) => m.provider === "anthropic"),
    openai: models.filter((m) => m.provider === "openai"),
    google: models.filter((m) => m.provider === "google"),
  };

  for (const [provider, providerModels] of Object.entries(byProvider)) {
    console.log(`  ${provider.toUpperCase()}:`);
    for (const model of providerModels) {
      console.log(`    - ${model.id} (${formatContextWindow(model.contextWindow)}, $${model.pricing.input}/M input)`);
    }
  }
  console.log();

  console.log("2. 에이전트 목록");
  console.log("-".repeat(40));
  const agents = supercoin.agents.list();
  console.log(`총 ${agents.length}개 에이전트 등록됨:\n`);

  for (const agent of agents) {
    console.log(`  ${agent.displayName} (${agent.name})`);
    console.log(`    모델: ${agent.model}`);
    console.log(`    기능: ${agent.capabilities.join(", ")}`);
    console.log();
  }

  console.log("3. 인증 상태 확인");
  console.log("-".repeat(40));
  const statuses = await supercoin.auth.status();

  for (const status of statuses) {
    const icon = status.authenticated ? "✓" : "✗";
    const authType = status.type || "none";
    console.log(`  ${icon} ${status.displayName}: ${status.authenticated ? "인증됨" : "미인증"} (${authType})`);
  }
  console.log();

  console.log("4. 도구 목록");
  console.log("-".repeat(40));
  const tools = supercoin.tools.list();
  console.log(`총 ${tools.length}개 도구 등록됨:\n`);

  for (const tool of tools) {
    console.log(`  ${tool.name}: ${tool.description}`);
  }
  console.log();

  console.log("5. TODO 관리 데모");
  console.log("-".repeat(40));

  await supercoin.todos.create({ content: "코드베이스 분석", priority: "high" });
  await supercoin.todos.create({ content: "API 구현", priority: "high" });
  await supercoin.todos.create({ content: "테스트 작성", priority: "medium" });
  await supercoin.todos.create({ content: "문서화", priority: "low" });

  console.log("생성된 TODO 목록:");
  for (const todo of supercoin.todos.list()) {
    const priorityIcon = { high: "🔴", medium: "🟡", low: "🟢" }[todo.priority];
    console.log(`  ${priorityIcon} [${todo.status}] ${todo.content}`);
  }
  console.log();

  const firstTodo = supercoin.todos.list()[0];
  await supercoin.todos.updateStatus(firstTodo.id, "completed");
  console.log(`"${firstTodo.content}" 완료 처리됨`);
  console.log(`남은 작업: ${supercoin.todos.listPending().length}개`);
  console.log();

  console.log("6. 도구 실행 데모");
  console.log("-".repeat(40));

  const grepResult = await supercoin.executeTool("grep", {
    pattern: "export.*function",
    path: "src",
    include: "*.ts",
  });

  if (grepResult.success) {
    const lines = grepResult.output?.split("\n").slice(0, 5) || [];
    console.log(`grep 결과 (상위 5개):`);
    for (const line of lines) {
      if (line.trim()) {
        console.log(`  ${line.substring(0, 80)}...`);
      }
    }
  } else {
    console.log(`grep 실행 실패: ${grepResult.error}`);
  }
  console.log();

  console.log("7. 세션 관리 데모");
  console.log("-".repeat(40));

  const sessionId = supercoin.createSession();
  console.log(`새 세션 생성: ${sessionId.substring(0, 8)}...`);

  const currentSession = supercoin.sessions.getCurrent();
  console.log(`현재 세션 모델: ${currentSession?.model}`);
  console.log(`작업 디렉토리: ${currentSession?.workdir}`);
  console.log();

  console.log("8. 백그라운드 작업 데모");
  console.log("-".repeat(40));

  const taskId = await supercoin.spawnBackground(
    "explorer",
    "Find all TypeScript files in the project",
    "TypeScript 파일 검색"
  );
  console.log(`백그라운드 작업 생성: ${taskId.substring(0, 8)}...`);

  const taskStatus = await supercoin.background.getStatus(taskId);
  console.log(`작업 상태: ${taskStatus?.status}`);
  console.log();

  console.log("=".repeat(60));
  console.log("데모 완료!");
  console.log("=".repeat(60));
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${tokens / 1000000}M`;
  }
  return `${tokens / 1000}K`;
}

main().catch(console.error);
