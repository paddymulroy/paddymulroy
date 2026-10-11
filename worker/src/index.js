// Receives the contact form on mulroy.me and emails it to the verified inbox in env.TO.
import { EmailMessage } from "cloudflare:email";

const FROM = "form@mulroy.me";
const SITE = "https://mulroy.me";
const ALLOWED_ORIGINS = ["https://mulroy.me", "https://www.mulroy.me"];
const LIMITS = { "first-name": 80, "last-name": 80, email: 200, phone: 40, company: 150, message: 5000 };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/contact") return new Response("Not found", { status: 404 });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });

    const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
    const reply = (ok, status, error) => wantsJson
      ? new Response(JSON.stringify(ok ? { ok } : { ok, error }), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } })
      : Response.redirect(`${SITE}/contact.html#${ok ? "sent" : "send-error"}`, 303);

    const origin = request.headers.get("Origin");
    if (origin && !ALLOWED_ORIGINS.includes(origin)) return reply(false, 403, "Forbidden");

    let raw;
    try {
      const type = request.headers.get("Content-Type") || "";
      raw = type.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
    } catch {
      return reply(false, 400, "Invalid form");
    }

    // Honeypot: real visitors never see or fill this field.
    if (raw.website) return reply(true, 200);

    const f = {};
    for (const [key, max] of Object.entries(LIMITS)) {
      let v = String(raw[key] ?? "").trim().slice(0, max);
      if (key !== "message") v = v.replace(/[\r\n\t]+/g, " "); // no header injection
      f[key] = v;
    }
    const emailOk = /^[^\s@<>"(),;:\\]+@[^\s@<>"(),;:\\]+\.[^\s@<>"(),;:\\]+$/.test(f.email);
    if (!f["first-name"] || !f["last-name"] || !emailOk || !f.message) return reply(false, 400, "Missing or invalid fields");
    if (!env.TO) return reply(false, 500, "Not configured");

    const name = `${f["first-name"]} ${f["last-name"]}`;
    const body = [
      `Name:    ${name}`,
      `Email:   ${f.email}`,
      `Phone:   ${f.phone || "-"}`,
      `Company: ${f.company || "-"}`,
      "",
      f.message,
      "",
      "--",
      "Sent from the contact form on mulroy.me. Reply to this email to answer them directly.",
    ].join("\r\n");

    const mime = [
      `From: "mulroy.me contact form" <${FROM}>`,
      `To: <${env.TO}>`,
      `Reply-To: ${encodeWord(name)} <${f.email}>`,
      `Subject: ${encodeWord(`Website message from ${name}`)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@mulroy.me>`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      base64(body).replace(/.{76}/g, "$&\r\n"),
    ].join("\r\n");

    try {
      await env.EMAIL.send(new EmailMessage(FROM, env.TO, mime));
    } catch (err) {
      console.error("send failed", err && err.message);
      return reply(false, 502, "Send failed");
    }
    return reply(true, 200);
  },
};

function base64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function encodeWord(text) {
  return `=?UTF-8?B?${base64(text)}?=`;
}
