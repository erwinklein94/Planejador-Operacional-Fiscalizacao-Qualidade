// Public project configuration. Authorization is enforced by Auth, RLS and the Edge Function.
export const SUPABASE_URL = "https://sesgiivthqftoevdenhn.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_zwihnktPmtDsFGNao4ZW0Q_zGObbA0d";
let client;
export function getClient() {
  if (!client) {
    if (!globalThis.supabase?.createClient)
      throw new Error(
        "Não foi possível carregar a conexão segura. Recarregue a página.",
      );
    client = globalThis.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          storage: globalThis.sessionStorage,
          storageKey: "planner-auth-session",
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    );
  }
  return client;
}
export function cloudError(error) {
  if (error?.code === "PT409" || error?.status === 409)
    return new Error(
      "Os dados foram alterados em outra sessão. Atualize a página antes de salvar.",
    );
  if (error?.code === "42501" || error?.status === 401 || error?.status === 403)
    return new Error(
      "Acesso não autorizado. Entre com uma conta cadastrada e ativa.",
    );
  return new Error(
    error?.message ||
      "Não foi possível acessar o Supabase. Verifique sua conexão e tente novamente.",
  );
}
export async function callPlanner(body) {
  const {
    data: { session },
    error,
  } = await getClient().auth.getSession();
  if (error || !session) throw new Error("Entre com sua conta para continuar.");
  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/planner-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Não foi possível salvar no Supabase. Verifique a conexão; os dados não foram salvos.",
    );
  }
  const result = await response.json();
  if (!response.ok)
    throw cloudError({ message: result.error, status: response.status });
  return result;
}
