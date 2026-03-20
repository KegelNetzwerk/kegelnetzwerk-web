import { prisma } from './prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

/**
 * Send a push notification to all app users in a club.
 * Silently ignores individual delivery failures.
 */
export async function sendPushToClub(
  clubId: number,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const tokens = await prisma.pushToken.findMany({
    where: { member: { clubId } },
    select: { token: true },
  });

  if (tokens.length === 0) return;

  const messages: PushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    sound: 'default',
    ...(data ? { data } : {}),
  }));

  // Expo Push API accepts up to 100 messages per request
  const chunks = chunk(messages, 100);
  await Promise.allSettled(
    chunks.map((batch) =>
      fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      })
    )
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
