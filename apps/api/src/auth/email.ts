import {
  emailTokenTtlMinutes,
  getAuthEmailProvider,
  normalizeEmail,
  randomHex,
  sha256Hex,
} from "./shared";
import type { AuthUserRecord, Bindings } from "./types";

const jsonHeaders = {
  "content-type": "application/json",
};

const isExpired = (value: string | null | undefined) => {
  if (!value) return true;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed <= Date.now() : true;
};

export const sendMagicLinkEmail = async (
  bindings: Bindings,
  email: string,
  loginUrl: string,
) => {
  const emailProvider = getAuthEmailProvider(bindings);
  const fromEmail = bindings.AUTH_EMAIL_FROM ?? "PsyOS <hello@psyos.org>";
  const subject = "Your PsyOS sign-in link";
  const text = `Use this link to sign in to PsyOS:\n\n${loginUrl}\n\nThis link expires in ${emailTokenTtlMinutes} minutes.`;
  const html = `<p>Use this link to sign in to PsyOS:</p><p><a href="${loginUrl}">${loginUrl}</a></p><p>This link expires in ${emailTokenTtlMinutes} minutes.</p>`;

  if (emailProvider === "preview") {
    return {
      channel: "preview",
      status: "preview" as const,
      messageId: null,
      previewUrl: loginUrl,
    };
  }

  if (emailProvider === "mailpit") {
    if (!bindings.MAILPIT_HTTP_URL) {
      throw new Error(
        "MAILPIT_HTTP_URL is required when AUTH_EMAIL_PROVIDER=mailpit.",
      );
    }

    const response = await fetch(
      `${bindings.MAILPIT_HTTP_URL.replace(/\/$/, "")}/api/v1/send`,
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          From: {
            Email: fromEmail.includes("<")
              ? fromEmail.slice(
                  fromEmail.indexOf("<") + 1,
                  fromEmail.indexOf(">"),
                )
              : fromEmail,
            Name: fromEmail.includes("<")
              ? fromEmail.slice(0, fromEmail.indexOf("<")).trim()
              : "PsyOS",
          },
          To: [{ Email: email }],
          Subject: subject,
          Text: text,
          HTML: html,
          Tags: ["psyos-auth"],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Mailpit send failed with status ${response.status}.`);
    }

    return {
      channel: "mailpit",
      status: "sent" as const,
      messageId: null,
      previewUrl: null,
    };
  }

  if (emailProvider === "resend") {
    if (!bindings.AUTH_RESEND_API_KEY) {
      throw new Error(
        "AUTH_RESEND_API_KEY is required when AUTH_EMAIL_PROVIDER=resend.",
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        Authorization: `Bearer ${bindings.AUTH_RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend send failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      id?: string;
    };

    return {
      channel: "resend",
      status: "sent" as const,
      messageId: payload.id ?? null,
      previewUrl: null,
    };
  }

  throw new Error(`Unsupported AUTH_EMAIL_PROVIDER "${emailProvider}".`);
};

export const persistMagicLink = async (
  env: Bindings,
  userId: string,
  email: string,
) => {
  if (!env.DB) return null;

  const token = randomHex(24);
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + emailTokenTtlMinutes * 60 * 1000);

  await env.DB.prepare(
    `INSERT INTO email_login_tokens (
      id,
      user_id,
      email,
      normalized_email,
      purpose,
      token_hash,
      expires_at,
      created_at
    ) VALUES (?, ?, ?, ?, 'login', ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      email,
      normalizeEmail(email),
      tokenHash,
      expiresAt.toISOString(),
      now.toISOString(),
    )
    .run();

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
};

export const consumeMagicLink = async (env: Bindings, token: string) => {
  if (!env.DB) return null;

  const tokenHash = await sha256Hex(token);
  const record = await env.DB.prepare(
    `SELECT
      id,
      user_id AS userId,
      email,
      normalized_email AS normalizedEmail,
      expires_at AS expiresAt,
      consumed_at AS consumedAt
    FROM email_login_tokens
    WHERE token_hash = ?
    LIMIT 1`,
  )
    .bind(tokenHash)
    .first<{
      id: string;
      userId: string | null;
      email: string;
      normalizedEmail: string;
      expiresAt: string;
      consumedAt: string | null;
    }>();

  if (!record || record.consumedAt || isExpired(record.expiresAt)) {
    return null;
  }

  await env.DB.prepare(
    `UPDATE email_login_tokens
    SET consumed_at = ?
    WHERE id = ?`,
  )
    .bind(new Date().toISOString(), record.id)
    .run();

  await env.DB.prepare(
    `UPDATE user_emails
    SET is_verified = 1,
        verified_at = COALESCE(verified_at, ?)
    WHERE normalized_email = ?`,
  )
    .bind(new Date().toISOString(), record.normalizedEmail)
    .run();

  return env.DB.prepare(
    `SELECT
      u.id,
      u.handle,
      u.display_name AS displayName,
      u.avatar_url AS avatarUrl,
      u.status,
      u.created_at AS createdAt,
      ue.email AS primaryEmail
    FROM users u
    JOIN user_emails ue ON ue.user_id = u.id AND ue.normalized_email = ?
    WHERE u.id = COALESCE(?, u.id)
    LIMIT 1`,
  )
    .bind(record.normalizedEmail, record.userId)
    .first<AuthUserRecord>();
};
