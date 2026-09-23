export type PlayerEventListener = (payload?: unknown) => void;

type EventCapablePlayer = {
  off?: (event: string, callback: PlayerEventListener) => void;
};

export function detachPlayerEventListeners(
  player: EventCapablePlayer,
  listeners: ReadonlyArray<readonly [event: string, listener: PlayerEventListener]>,
) {
  for (const [event, listener] of listeners) {
    try {
      player.off?.(event, listener);
    } catch {
      // Bunny Player.js can null its postMessage target before React runs an
      // iframe effect cleanup. At that point the frame owns no useful event
      // subscription, so an unsubscribe failure must not crash the lesson UI.
    }
  }
}
