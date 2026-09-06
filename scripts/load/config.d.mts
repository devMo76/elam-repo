export type LoadTestConfig = {
  target: URL;
  concurrency: number;
  durationSeconds: number;
  scenario: string;
  cookie?: string;
  identifier?: string;
};

export function loadTestConfig(
  environment?: Record<string, string | undefined>,
): LoadTestConfig;

export function scenarioRequest(config: LoadTestConfig): {
  path: string;
  options: RequestInit;
};
