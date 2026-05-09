export function resolveLocalMutationToken(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  return env.KIRO_LOCAL_TOKEN ?? env.TEMPO_LOCAL_TOKEN;
}
