import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import { getBunnyStreamEnvironment } from "@/lib/env/server";

const bunnyVideoSchema = z.object({
  guid: z.uuid(),
  videoLibraryId: z.number().int().positive(),
  length: z.number().int().nonnegative().default(0),
  status: z.number().int().min(0).max(10),
  encodeProgress: z.number().int().min(0).max(100),
});

const BUNNY_VIDEO_API_URL = "https://video.bunnycdn.com";
const BUNNY_TUS_UPLOAD_URL = `${BUNNY_VIDEO_API_URL}/tusupload`;
const UPLOAD_TTL_SECONDS = 2 * 60 * 60;
const PLAYBACK_TTL_SECONDS = 2 * 60 * 60;

export type BunnyVideo = z.infer<typeof bunnyVideoSchema>;

export class BunnyStreamError extends Error {
  constructor(
    operation: string,
    public readonly status?: number,
  ) {
    super(`Bunny Stream operation failed: ${operation}`);
    this.name = "BunnyStreamError";
  }
}

function getLibraryPath(path: string) {
  const environment = getBunnyStreamEnvironment();

  return `${BUNNY_VIDEO_API_URL}/library/${environment.BUNNY_STREAM_LIBRARY_ID}${path}`;
}

async function parseVideoResponse(
  response: Response,
  operation: string,
): Promise<BunnyVideo> {
  if (!response.ok) {
    throw new BunnyStreamError(operation, response.status);
  }

  const result = bunnyVideoSchema.safeParse(await response.json());

  if (!result.success) {
    throw new BunnyStreamError(`${operation}: invalid response`);
  }

  return result.data;
}

export async function createBunnyVideo(title: string): Promise<BunnyVideo> {
  const environment = getBunnyStreamEnvironment();

  const response = await fetch(getLibraryPath("/videos"), {
    method: "POST",
    headers: {
      AccessKey: environment.BUNNY_STREAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
    signal: AbortSignal.timeout(10_000),
  });

  return parseVideoResponse(response, "create video");
}

export async function getBunnyVideo(videoId: string): Promise<BunnyVideo> {
  const environment = getBunnyStreamEnvironment();

  const response = await fetch(getLibraryPath(`/videos/${videoId}`), {
    headers: {
      AccessKey: environment.BUNNY_STREAM_READ_ONLY_API_KEY,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  return parseVideoResponse(response, "get video");
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const environment = getBunnyStreamEnvironment();

  const response = await fetch(getLibraryPath(`/videos/${videoId}`), {
    method: "DELETE",
    headers: {
      AccessKey: environment.BUNNY_STREAM_API_KEY,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new BunnyStreamError("delete video", response.status);
  }
}

export function createBunnyUploadAuthorization(
  videoId: string,
  nowMilliseconds = Date.now(),
) {
  const environment = getBunnyStreamEnvironment();
  const expires = Math.floor(nowMilliseconds / 1000) + UPLOAD_TTL_SECONDS;

  const signature = createHash("sha256")
    .update(
      `${environment.BUNNY_STREAM_LIBRARY_ID}${environment.BUNNY_STREAM_API_KEY}${expires}${videoId}`,
    )
    .digest("hex");

  return {
    endpoint: BUNNY_TUS_UPLOAD_URL,
    expiresAt: new Date(expires * 1000).toISOString(),
    headers: {
      AuthorizationSignature: signature,
      AuthorizationExpire: String(expires),
      LibraryId: environment.BUNNY_STREAM_LIBRARY_ID,
      VideoId: videoId,
    },
  };
}

export function createBunnyPlaybackCredential(
  videoId: string,
  nowMilliseconds = Date.now(),
) {
  const environment = getBunnyStreamEnvironment();
  const expires = Math.floor(nowMilliseconds / 1000) + PLAYBACK_TTL_SECONDS;
  const token = createHash("sha256")
    .update(`${environment.BUNNY_STREAM_TOKEN_KEY}${videoId}${expires}`)
    .digest("hex");

  const playbackUrl = new URL(
    `https://player.mediadelivery.net/embed/${environment.BUNNY_STREAM_LIBRARY_ID}/${videoId}`,
  );
  playbackUrl.searchParams.set("token", token);
  playbackUrl.searchParams.set("expires", String(expires));

  return {
    playbackUrl: playbackUrl.toString(),
    expiresAt: new Date(expires * 1000).toISOString(),
  };
}
