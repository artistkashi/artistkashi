type VideoWithWebkitFullscreen = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
};

type DocWithWebkit = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isInFullscreen(): boolean {
  return (
    !!document.fullscreenElement ||
    !!(document as DocWithWebkit).webkitFullscreenElement
  );
}

async function lockLandscape(): Promise<void> {
  try {
    const so = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (typeof so?.lock === "function") {
      await so.lock("landscape");
    }
  } catch {
    // Orientation lock is unsupported (e.g. iPhone Safari) — ignore.
  }
}

async function unlockOrientation(): Promise<void> {
  try {
    const so = screen.orientation as ScreenOrientation & {
      unlock?: () => Promise<void>;
    };
    if (typeof so?.unlock === "function") {
      so.unlock();
    }
  } catch {
    // ignore
  }
}

/**
 * Enters fullscreen for a video player.
 * - iPhone/iPad (Safari): uses the native `webkitEnterFullscreen` player,
 *   which is the only fullscreen that works on iOS and plays in landscape.
 * - Everything else: fullscreens the container (keeps custom controls) and
 *   locks the screen to landscape where supported.
 */
export async function enterVideoFullscreen(
  video: HTMLVideoElement | null,
  container: HTMLElement | null
): Promise<void> {
  if (isIOSDevice() && video) {
    const webkitVideo = video as VideoWithWebkitFullscreen;
    if (typeof webkitVideo.webkitEnterFullscreen === "function") {
      webkitVideo.webkitEnterFullscreen();
      return;
    }
  }

  if (container && typeof container.requestFullscreen === "function") {
    const wasPlaying = video ? !video.paused : false;
    try {
      await container.requestFullscreen();
      // Some Android browsers pause the video when a parent container
      // enters fullscreen — resume playback if it was playing.
      if (wasPlaying && video && video.paused) {
        video.play().catch(() => {});
      }
    } catch {
      // Fullscreen request rejected — ignore.
    }
    await lockLandscape();
  }
}

export async function exitVideoFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch {
    // ignore
  }
  try {
    (document as DocWithWebkit).webkitExitFullscreen?.();
  } catch {
    // ignore
  }
  await unlockOrientation();
}
