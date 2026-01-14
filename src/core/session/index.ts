export * from './types';
export { SessionManager, sessionManager } from './manager';
export { SessionCache, sessionCache, type CacheEntry, type CacheStats, type CacheConfig } from './cache';
export { SessionExporter, sessionExporter } from './exporter';
export {
  storeAttachment,
  loadAttachment,
  processAttachmentsForStorage,
  resolveAttachment,
  resolveAttachments,
  cleanupOldAttachments,
  getAttachmentType,
  extractBase64Data,
  calculateBase64Size,
} from './attachments';
