import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadToAppStorage } from './localDownloads';
import { recordDownloadEvent } from './notifications';
import { contentProvider } from './provider';

export type DownloadItem = {
  id: string;
  title: string;
  url?: string;
  type: 'video' | 'audio';
  format?: string;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number;
  createdAt: number;
  localUri?: string;
  error?: string;
  videoId?: string;
};

const KEY = 'clone.downloads.v5';
async function save(items: DownloadItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export const downloadManager = {
  async list() {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DownloadItem[]) : [];
  },
  async enqueue(input: Omit<DownloadItem, 'status' | 'progress' | 'createdAt'>) {
    const items = await this.list();
    const item: DownloadItem = { ...input, status: 'queued', progress: 0, createdAt: Date.now() };
    await save([item, ...items.filter(x => x.id !== item.id)]);
    void this.start(item.id);
    return item;
  },
  async update(id: string, patch: Partial<DownloadItem>) {
    await save((await this.list()).map(x => (x.id === id ? { ...x, ...patch } : x)));
  },
  async remove(id: string) {
    await save((await this.list()).filter(x => x.id !== id));
  },
  async clearCompleted() {
    await save((await this.list()).filter(x => x.status !== 'completed'));
  },
  async pause(id: string) {
    await this.update(id, { status: 'paused' });
  },
  async resume(id: string) {
    await this.update(id, { status: 'queued', error: undefined });
    void this.start(id);
  },
  async retry(id: string) {
    await this.update(id, { status: 'queued', progress: 0, error: undefined });
    void this.start(id);
  },
  async start(id: string) {
    let item = (await this.list()).find(x => x.id === id);
    if (!item || item.status === 'completed') return;

    try {
      // Re-resolve stream URL if missing
      if (!item.url && item.format) {
        const videoId = item.videoId || item.id.split('-')[0];
        const freshUrl = await contentProvider.resolveStream(videoId, item.format as any);
        if (freshUrl) {
          item.url = freshUrl;
          await this.update(id, { url: freshUrl });
        }
      }

      if (!item.url) {
        throw new Error('Download URL expired or unavailable. Please retry.');
      }

      await recordDownloadEvent({ id, title: item.title, status: 'started', at: Date.now() });
      await this.update(id, { status: 'downloading', progress: 0 });

      let localUri: string;
      try {
        localUri = await downloadToAppStorage(item, p => {
          this.update(id, { progress: p, status: 'downloading' });
        });
      } catch (dlErr: any) {
        // If download failed due to expired link, attempt 1 fresh re-resolution
        const videoId = item.videoId || item.id.split('-')[0];
        if (item.format) {
          const freshUrl = await contentProvider.resolveStream(videoId, item.format as any);
          if (freshUrl && freshUrl !== item.url) {
            item.url = freshUrl;
            await this.update(id, { url: freshUrl });
            localUri = await downloadToAppStorage(item, p => {
              this.update(id, { progress: p, status: 'downloading' });
            });
          } else {
            throw dlErr;
          }
        } else {
          throw dlErr;
        }
      }

      await this.update(id, { status: 'completed', progress: 1, localUri });
      await recordDownloadEvent({ id, title: item.title, status: 'completed', at: Date.now() });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'DOWNLOAD_FAILED';
      await this.update(id, { status: 'failed', error });
      await recordDownloadEvent({ id, title: item.title, status: 'failed', at: Date.now() });
    }
  },
};
