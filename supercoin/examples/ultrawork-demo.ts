import { createSuperCoin } from "../src/supercoin";
import { SuperCoinConfigSchema } from "../src/config/schema";
import { classifyRequest, RequestType } from "../src/services/agents/orchestrator";

async function main() {
  console.log("=".repeat(60));
  console.log("SuperCoin UltraWork 시나리오 데모");
  console.log("Multi-Agent Orchestration 워크플로우");
  console.log("=".repeat(60));
  console.log();

  const config = SuperCoinConfigSchema.parse({
    default_model: "anthropic/claude-sonnet-4",
    fallback_models: ["openai/gpt-4o", "google/gemini-2.0-flash"],
  });

  const supercoin = createSuperCoin(config, process.cwd());
  await supercoin.initialize();

  console.log("시나리오 1: 요청 분류 (Request Classification)");
  console.log("-".repeat(50));

  const testRequests = [
    "What is TypeScript?",
    "Run npm test",
    "How does the auth module work?",
    "Refactor the database layer",
    "Create API and then deploy it",
    "전체 코드베이스를 분석해줘",
    "이 파일 리뷰해줘",
  ];

  for (const request of testRequests) {
    const type = classifyRequest(request);
    const typeLabel = {
      [RequestType.TRIVIAL]: "TRIVIAL (단순 질문)",
      [RequestType.EXPLICIT]: "EXPLICIT (명확한 명령)",
      [RequestType.EXPLORATORY]: "EXPLORATORY (탐색)",
      [RequestType.OPEN_ENDED]: "OPEN_ENDED (열린 질문)",
      [RequestType.COMPLEX]: "COMPLEX (복합 작업)",
    }[type];

    console.log(`  "${request}"`);
    console.log(`  → ${typeLabel}`);
    console.log();
  }

  console.log("시나리오 2: 에이전트 선택 전략");
  console.log("-".repeat(50));

  const agentSelectionCases = [
    { task: "대용량 코드 분석", agent: "analyst", reason: "Gemini - 1M 토큰 컨텍스트" },
    { task: "코드베이스 검색", agent: "explorer", reason: "Haiku - 빠른 응답" },
    { task: "npm build 실행", agent: "executor", reason: "GPT-4o - 명령 실행 특화" },
    { task: "보안 취약점 검토", agent: "code_reviewer", reason: "Opus - 심층 분석" },
    { task: "README 작성", agent: "doc_writer", reason: "Gemini Pro - 문서화 특화" },
  ];

  console.log("  작업별 최적 에이전트 매핑:\n");
  for (const { task, agent, reason } of agentSelectionCases) {
    const agentInfo = supercoin.agents.get(agent as any);
    console.log(`  📋 ${task}`);
    console.log(`     → ${agentInfo?.displayName} (${agentInfo?.model})`);
    console.log(`     이유: ${reason}`);
    console.log();
  }

  console.log("시나리오 3: 병렬 백그라운드 작업");
  console.log("-".repeat(50));

  console.log("  3개의 분석 작업을 병렬로 시작...\n");

  const tasks = await Promise.all([
    supercoin.spawnBackground("explorer", "Find all API endpoints", "API 엔드포인트 검색"),
    supercoin.spawnBackground("analyst", "Analyze code architecture", "아키텍처 분석"),
    supercoin.spawnBackground("explorer", "Find all test files", "테스트 파일 검색"),
  ]);

  for (let i = 0; i < tasks.length; i++) {
    const status = await supercoin.background.getStatus(tasks[i]);
    console.log(`  작업 ${i + 1}: ${status?.description}`);
    console.log(`    ID: ${tasks[i].substring(0, 8)}...`);
    console.log(`    상태: ${status?.status}`);
    console.log(`    에이전트: ${status?.agent}`);
    console.log();
  }

  console.log("시나리오 4: TODO 기반 작업 추적");
  console.log("-".repeat(50));

  supercoin.todos.clear();

  const todoItems = [
    { content: "1. 코드베이스 구조 분석", priority: "high" as const },
    { content: "2. API 설계", priority: "high" as const },
    { content: "3. 구현", priority: "high" as const },
    { content: "4. 테스트 작성", priority: "medium" as const },
    { content: "5. 문서화", priority: "low" as const },
  ];

  for (const item of todoItems) {
    await supercoin.todos.create(item);
  }

  console.log("  작업 계획 생성:\n");

  const allTodos = supercoin.todos.list();
  for (const todo of allTodos) {
    const icon = { high: "🔴", medium: "🟡", low: "🟢" }[todo.priority];
    console.log(`  ${icon} ${todo.content}`);
  }
  console.log();

  console.log("  작업 진행 시뮬레이션:\n");

  for (let i = 0; i < 3; i++) {
    const pending = supercoin.todos.listPending();
    if (pending.length === 0) break;

    const current = pending[0];
    await supercoin.todos.updateStatus(current.id, "in_progress");
    console.log(`  ▶ 진행 중: ${current.content}`);

    await new Promise((r) => setTimeout(r, 100));

    await supercoin.todos.updateStatus(current.id, "completed");
    console.log(`  ✓ 완료: ${current.content}`);
    console.log();
  }

  const remaining = supercoin.todos.listPending();
  console.log(`  남은 작업: ${remaining.length}개`);
  console.log();

  console.log("시나리오 5: 모델 폴백 체인");
  console.log("-".repeat(50));

  const router = supercoin.models;
  const current = router.getCurrentModel();

  console.log(`  기본 모델: ${current.provider}/${current.model}`);
  console.log(`  폴백 체인: ${config.fallback_models.join(" → ")}`);
  console.log();

  console.log("  모델별 비용 비교:\n");

  const modelsToCompare = [
    "anthropic/claude-opus-4-5",
    "anthropic/claude-sonnet-4",
    "anthropic/claude-haiku-3-5",
    "openai/gpt-4o",
    "google/gemini-2.0-flash",
  ];

  for (const modelId of modelsToCompare) {
    const info = router.getModelInfo(modelId);
    if (info) {
      console.log(`  ${info.name}`);
      console.log(`    입력: $${info.pricing.input.toFixed(2)}/M, 출력: $${info.pricing.output.toFixed(2)}/M`);
      console.log(`    컨텍스트: ${formatContextWindow(info.contextWindow)}`);
      console.log();
    }
  }

  console.log("시나리오 6: 훅 시스템");
  console.log("-".repeat(50));

  const hooks = supercoin.hooks.list();
  console.log(`  등록된 훅: ${hooks.length}개\n`);

  for (const hook of hooks) {
    console.log(`  ${hook.name}`);
    console.log(`    이벤트: ${hook.events.join(", ")}`);
    console.log(`    우선순위: ${hook.priority || 0}`);
    console.log();
  }

  console.log("=".repeat(60));
  console.log("UltraWork 데모 완료!");
  console.log("=".repeat(60));
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${tokens / 1000000}M`;
  }
  return `${tokens / 1000}K`;
}

main().catch(console.error);
