export const database = new sst.cloudflare.D1("Database");

export const sessionStore = new sst.cloudflare.Kv("SessionStore");

export const rateLimitStore = new sst.cloudflare.Kv("RateLimitStore");

export const fileBucket = new sst.cloudflare.Bucket("FileBucket");

export const logBucket = new sst.cloudflare.Bucket("LogBucket");
