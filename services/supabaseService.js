import { getClient, callPlanner, cloudError } from "./supabaseClient.js";
export const supabaseAdapter = {
  async read(page = "dashboard") {
    const { data, error } = await getClient().rpc("read_planner", {
      p_page: page,
    });
    if (error) throw cloudError(error);
    return data;
  },
  async write(payload, revision) {
    return callPlanner({ action: "save-state", payload, revision });
  },
};
