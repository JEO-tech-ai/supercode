import * as fs from 'fs/promises';
import * as path from 'path';
import { Log } from '../../shared/logger';
import type {
  SessionExportFormat,
  SessionImportResult,
} from './types';

export class SessionExporter {
  private exportPath: string;

  constructor(exportPath: string = path.join(process.cwd(), '.supercoin', 'exports')) {
    this.exportPath = exportPath;
  }

  async exportToFile(
    sessionId: string,
    sessionData: SessionExportFormat,
    format: 'json' | 'yaml' = 'json'
  ): Promise<string> {
    await fs.mkdir(this.exportPath, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `session-${sessionId}-${timestamp}.${format}`;
    const filePath = path.join(this.exportPath, fileName);

    const content = format === 'json'
      ? JSON.stringify(sessionData, null, 2)
      : JSON.stringify(sessionData, null, 2);

    await fs.writeFile(filePath, content, 'utf-8');

    Log.info(`📤 Exported session to: ${filePath}`);
    return filePath;
  }

  async importFromFile(filePath: string): Promise<SessionImportResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data: SessionExportFormat = JSON.parse(content);

      const result: SessionImportResult = {
        success: true,
        sessionId: data.session.sessionId,
        importedCount: 1,
        skippedCount: 0,
        errors: [],
      };

      Log.info(`📥 Imported session from: ${filePath}`);
      return result;
    } catch (error) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: [`Failed to import: ${(error as Error).message}`],
      };
    }
  }

  async exportMultiple(
    sessions: string[],
    format: 'json' | 'yaml' = 'json'
  ): Promise<{ success: string[]; failed: Array<{ sessionId: string; error: string }> }> {
    const success: string[] = [];
    const failed: Array<{ sessionId: string; error: string }> = [];

    for (const sessionId of sessions) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `session-${sessionId}-${timestamp}.${format}`;
        const filePath = path.join(this.exportPath, fileName);

        await fs.writeFile(filePath, JSON.stringify({ sessionId }, null, 2), 'utf-8');
        success.push(filePath);
      } catch (error) {
        failed.push({ sessionId, error: (error as Error).message });
      }
    }

    Log.info(`📤 Exported ${success.length} sessions, ${failed.length} failed`);
    return { success, failed };
  }

  async importMultiple(
    filePaths: string[]
  ): Promise<SessionImportResult> {
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const filePath of filePaths) {
      const result = await this.importFromFile(filePath);

      if (result.success) {
        importedCount += result.importedCount;
        skippedCount += result.skippedCount;
      } else {
        errors.push(...result.errors);
      }
    }

    return {
      success: errors.length === 0,
      importedCount,
      skippedCount,
      errors,
    };
  }

  async listExports(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.exportPath);
      return files.filter(f => f.startsWith('session-') && (f.endsWith('.json') || f.endsWith('.yaml')));
    } catch (error) {
      Log.warn(`Failed to list exports: ${(error as Error).message}`);
      return [];
    }
  }

  async deleteExport(fileName: string): Promise<boolean> {
    try {
      const filePath = path.join(this.exportPath, fileName);
      await fs.unlink(filePath);
      Log.info(`🗑️ Deleted export: ${fileName}`);
      return true;
    } catch (error) {
      Log.warn(`Failed to delete export ${fileName}: ${(error as Error).message}`);
      return false;
    }
  }

  async cleanup(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;

    try {
      const files = await fs.readdir(this.exportPath);

      for (const file of files) {
        if (!file.startsWith('session-')) continue;

        const filePath = path.join(this.exportPath, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      Log.info(`🧹 Cleaned up ${deletedCount} old exports`);
      return deletedCount;
    } catch (error) {
      Log.warn(`Failed to cleanup exports: ${(error as Error).message}`);
      return deletedCount;
    }
  }
}

export const sessionExporter = new SessionExporter();
