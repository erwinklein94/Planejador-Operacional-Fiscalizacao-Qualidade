import { getClient, callPlanner, cloudError } from "./supabaseClient.js";
export const authService = {
  async getSession() {
    const { data, error } = await getClient().auth.getSession();
    if (error) throw cloudError(error);
    return data.session;
  },
  async getProfile() {
    const {
      data: { user },
      error: authError,
    } = await getClient().auth.getUser();
    if (authError || !user)
      throw new Error("Entre com uma conta cadastrada para continuar.");
    const { data, error } = await getClient()
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .eq("active", true)
      .single();
    if (error || !data)
      throw new Error("Esta conta não tem acesso ativo ao planejador.");
    return data;
  },
  async signIn(email, password) {
    const { error } = await getClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error)
      throw new Error(
        error.status === 429
          ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          : "E-mail ou senha inválidos. Acesso somente para contas cadastradas.",
      );
    try {
      return await this.getProfile();
    } catch (error) {
      await this.signOut();
      throw error;
    }
  },
  async signOut() {
    // Local scope clears this browser session; the application drops its in-memory data as well.
    const { error } = await getClient().auth.signOut({ scope: "local" });
    if (error) throw cloudError(error);
  },
  async changePassword(password) {
    if (typeof password !== "string" || password.length < 8)
      throw new Error("A senha deve ter pelo menos 8 caracteres.");
    const { error } = await getClient().auth.updateUser({ password });
    if (error) throw cloudError(error);
  },
  async createAccount(record) {
    return callPlanner({ action: "create-account", account: record });
  },
  async listAccounts() {
    if ((await this.getProfile()).role !== "editor")
      throw new Error("Página exclusiva do editor.");
    const { data, error } = await getClient()
      .from("user_profiles")
      .select("*")
      .order("full_name");
    if (error) throw cloudError(error);
    return data;
  },
  async recentAccesses() {
    const { data, error } = await getClient().rpc("recent_accesses");
    if (error) throw cloudError(error);
    return data;
  },
};
