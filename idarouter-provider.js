/**
 * OpenCode plugin for idarouter.
 *
 * Install as a local or global plugin. When IDAROUTER_URL and
 * IDAROUTER_API_KEY are set, it fetches /api/providers from an idarouter server
 * and makes those providers/models the only enabled OpenCode providers. If
 * either value is missing, the plugin is a no-op and leaves OpenCode's normal
 * providers/models untouched.
 */
export const IdaRouterProvider = async (_ctx, options = {}) => {
  const load = async () => {
    const baseURL = String(options.baseURL || process.env.IDAROUTER_URL || "").replace(/\/$/, "")
    const apiKey = String(options.apiKey || process.env.IDAROUTER_API_KEY || "")
    const timeoutMs = Number(options.timeoutMs || 5000)
    if (!baseURL || !apiKey) return null

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(`${baseURL}/api/providers`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      })
      if (!resp.ok) throw new Error(`idarouter discovery failed: HTTP ${resp.status}`)
      return { baseURL, apiKey, providers: await resp.json() }
    } finally {
      clearTimeout(timer)
    }
  }

  const apply = (cfg, discovered) => {
    if (!discovered) return

    const providerPrefix = String(options.providerPrefix || "")
    const nextProviders = {}
    const seen = new Set()
    let defaultModel = ""

    for (const provider of discovered.providers) {
      const id = `${providerPrefix}${provider.id}`
      seen.add(id)
      nextProviders[id] = {
        id,
        name: provider.name || id,
        api: provider.api || "openai",
        options: {
          ...(provider.options || {}),
          baseURL: `${discovered.baseURL}/p/${provider.id}/v1`,
          apiKey: discovered.apiKey,
        },
        models: provider.models || {},
      }

      if (!defaultModel) {
        const firstModel = Object.keys(provider.models || {})[0]
        if (firstModel) defaultModel = `${id}/${firstModel}`
      }
    }

    cfg.provider = nextProviders
    cfg.enabled_providers = Array.from(seen)
    if (Array.isArray(cfg.disabled_providers)) {
      cfg.disabled_providers = cfg.disabled_providers.filter((id) => !seen.has(id))
    }

    const modelProvider = (model) => String(model || "").split("/", 1)[0]
    if (defaultModel && !seen.has(modelProvider(cfg.model))) cfg.model = defaultModel
    if (defaultModel && !seen.has(modelProvider(cfg.small_model))) cfg.small_model = defaultModel

    for (const id of Object.keys(cfg.provider)) {
      if (providerPrefix && id.startsWith(providerPrefix) && !seen.has(id)) delete cfg.provider[id]
    }
  }

  return {
    config: async (cfg) => {
      const discovered = await load()
      if (!discovered) return
      apply(cfg, discovered)
      const pollIntervalMs = options.pollIntervalMs === false ? 0 : Number(options.pollIntervalMs || 5000)
      if (pollIntervalMs > 0) {
        const interval = setInterval(async () => {
          try {
            apply(cfg, await load())
          } catch {
            // Keep the last good provider list if idarouter is temporarily unreachable.
          }
        }, pollIntervalMs)
        if (typeof interval.unref === "function") interval.unref()
      }
    },
  }
}

export default IdaRouterProvider
