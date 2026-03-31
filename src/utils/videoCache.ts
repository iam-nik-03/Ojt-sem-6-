/**
 * Utility to interact with the Video Caching Service Worker
 */

export const videoCache = {
  /**
   * Check if a video URL is already cached
   */
  async isCached(url: string): Promise<boolean> {
    const controller = navigator.serviceWorker.controller;
    if (!controller) {
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data && event.data.type === 'CACHE_STATUS' && event.data.url === url) {
          resolve(event.data.isCached);
        }
      };

      controller.postMessage(
        { type: 'CHECK_CACHE', url },
        [messageChannel.port2]
      );

      // Timeout after 1s
      setTimeout(() => resolve(false), 1000);
    });
  },

  /**
   * Request the Service Worker to precache a video
   */
  precache(url: string) {
    const controller = navigator.serviceWorker.controller;
    if (!controller) {
      return;
    }

    controller.postMessage({
      type: 'PRECACHE_VIDEO',
      url
    });
  },

  /**
   * Delete a video from cache
   */
  delete(url: string) {
    const controller = navigator.serviceWorker.controller;
    if (!controller) {
      return;
    }

    controller.postMessage({
      type: 'DELETE_CACHE',
      url
    });
  }
};
