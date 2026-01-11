export const githubClientId = new sst.Secret("GithubClientId");
export const githubClientSecret = new sst.Secret("GithubClientSecret");

export const jwtSecret = new sst.Secret("JwtSecret");

export const anthropicApiKey = new sst.Secret("AnthropicApiKey");
export const openaiApiKey = new sst.Secret("OpenaiApiKey");
export const googleApiKey = new sst.Secret("GoogleApiKey");

export const allSecrets = [
  githubClientId,
  githubClientSecret,
  jwtSecret,
  anthropicApiKey,
  openaiApiKey,
  googleApiKey,
];
