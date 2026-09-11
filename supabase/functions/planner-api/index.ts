import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { validateState } from "../../../utils/validation.js";

const allowedOrigins = new Set([
  "https://erwinklein94.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const url = Deno.env.get("SUPABASE_URL")!;
const secret =
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const roles = new Set(["editor", "fiscalizacao", "coordenacao"]);

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.has(origin))
    headers["Access-Control-Allow-Origin"] = origin;
  headers["Access-Control-Allow-Headers"] =
    "authorization, apikey, content-type, x-client-info";
  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  const reply = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status, headers });
  if (origin && !allowedOrigins.has(origin))
    return reply({ error: "Origem não autorizada." }, 403);
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST")
    return reply({ error: "Método não permitido." }, 405);
  try {
    // The gateway accepts publishable keys; this function verifies the live user itself.
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply({ error: "Autenticação obrigatória." }, 401);
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);
    if (authError || !user)
      return reply({ error: "Sessão inválida. Entre novamente." }, 401);
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .eq("active", true)
      .single();
    if (profileError || !profile || profile.role !== "editor")
      return reply(
        { error: "Somente um editor ativo pode executar esta ação." },
        403,
      );
    if (Number(request.headers.get("content-length") || 0) > 11 * 1024 * 1024)
      return reply({ error: "Solicitação acima do limite de 11 MB." }, 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 11 * 1024 * 1024)
      return reply({ error: "Solicitação acima do limite de 11 MB." }, 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply({ error: "JSON inválido." }, 400);
    }
    if (body.action === "create-account") {
      const account = body.account;
      if (
        !account ||
        typeof account.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email.trim()) ||
        account.email.length > 320 ||
        typeof account.full_name !== "string" ||
        !account.full_name.trim() ||
        account.full_name.length > 160 ||
        typeof account.password !== "string" ||
        account.password.length < 8 ||
        account.password.length > 128 ||
        !roles.has(account.role)
      )
        return reply(
          {
            error:
              "Informe nome, e-mail, perfil válido e senha entre 8 e 128 caracteres.",
          },
          400,
        );
      const { data, error } = await admin.auth.admin.createUser({
        email: account.email.trim().toLowerCase(),
        password: account.password,
        email_confirm: true,
        app_metadata: {
          planner_role: account.role,
          planner_name: account.full_name.trim(),
        },
      });
      if (error)
        return reply(
          {
            error:
              error.code === "email_exists" ||
              error.code === "user_already_exists"
                ? "Já existe uma conta com este e-mail."
                : "Não foi possível criar a conta. Verifique os dados e a política de senha.",
          },
          error.code === "email_exists" || error.code === "user_already_exists"
            ? 409
            : 400,
        );
      return reply(
        { id: data.user.id, message: "Conta cadastrada com sucesso." },
        201,
      );
    }
    if (body.action === "save-state") {
      if (!Number.isSafeInteger(body.revision) || body.revision < 0)
        return reply({ error: "Revisão inválida." }, 400);
      try {
        validateState(body.payload);
      } catch (error) {
        return reply(
          {
            error: error instanceof Error ? error.message : "Dados inválidos.",
          },
          400,
        );
      }
      // Only the verified user ID reaches the service-only commit RPC.
      // Server-owned attribution is added independently of any editable client history.
      body.payload.auditLog.unshift({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "Sincronização",
        record: "Base compartilhada",
        change: `Revisão ${body.revision + 1} salva no Supabase`,
        user: profile.full_name,
      });
      const { data, error } = await admin.rpc("commit_planner", {
        p_payload: body.payload,
        p_expected_revision: body.revision,
        p_actor: user.id,
      });
      if (error)
        return reply(
          {
            error:
              error.code === "PT409"
                ? "Os dados foram alterados em outra sessão. Atualize antes de salvar."
                : "Não foi possível salvar os dados no servidor.",
          },
          error.code === "PT409" ? 409 : error.code === "42501" ? 403 : 400,
        );
      return reply(data);
    }
    return reply({ error: "Ação desconhecida." }, 400);
  } catch {
    return reply(
      { error: "Não foi possível concluir a operação. Tente novamente." },
      500,
    );
  }
});
