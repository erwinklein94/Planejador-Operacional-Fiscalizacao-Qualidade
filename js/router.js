export const ROUTES = [
  "dashboard",
  "planejamento",
  "demandas",
  "escala",
  "fiscais",
  "fornecedores",
  "materiais",
  "risco",
  "cobertura",
  "rnc",
  "historico",
  "configuracoes",
  "perfil",
  "auditoria",
  "login",
];
export function readRoute() {
  const [path, query = ""] = (location.hash || "#/dashboard")
    .slice(2)
    .split("?");
  return {
    route: ROUTES.includes(path) ? path : "dashboard",
    query: Object.fromEntries(new URLSearchParams(query)),
  };
}
