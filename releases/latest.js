const __ARCH_BOOTSTRAP = { ready: null };
globalThis.ARCH = __ARCH_BOOTSTRAP;

async function getConfigValue() {
  try {
    async function loadModule(moduleName) {
      const url = `https://chibbit-99.github.io/arch.js/module/${moduleName}`;
      console.log(`[ARCH] Loading module: ${moduleName}`);
      const moduleResponse = await fetch(url);
      if (!moduleResponse.ok) {
        console.error(`[ARCH] Failed to fetch ${moduleName}: HTTP ${moduleResponse.status}`);
        return false;
      }
      const code = await moduleResponse.text();
      console.log(`[ARCH] Fetched ${moduleName} (${code.length} bytes)`);
      const script = document.createElement("script");
      script.textContent = code;
      (document.head || document.body || document.documentElement).appendChild(script);
      if (globalThis.ARCH) globalThis.ARCH.ready = __ARCH_BOOTSTRAP.ready;
      console.log(`[ARCH] Module loaded: ${moduleName}`);
      return true;
    }

    async function loadAllModulesFallback() {
      console.log("[ARCH] Discovering available ARCH modules...");
      const response = await fetch("https://api.github.com/repos/Chibbit-99/arch.js/contents/module?ref=main");
      if (!response.ok) throw new Error(`Could not discover ARCH modules: HTTP ${response.status}`);
      const entries = await response.json();
      const moduleNames = entries
        .filter(entry => entry && entry.type === "file" && typeof entry.name === "string" && entry.name.endsWith(".js"))
        .map(entry => entry.name);
      console.log(`[ARCH] Discovered ${moduleNames.length} module(s)`);
      for (const moduleName of moduleNames) await loadModule(moduleName);
      console.log("[ARCH] All discovered modules loaded successfully");
    }

    console.log("[ARCH] Loading config.json...");
    const response = await fetch("./arch/config.json");

    if (response.status === 404) {
      const docsURL = "https://chibbit-99.github.io/arch.js/docs/";
      console.warn("[ARCH] No arch/config.json found. Falling back to automatic module discovery. This approach is intended for development only and should not be used in production. See the ARCH.js docs: " + docsURL);
      await loadAllModulesFallback();
      console.log("[ARCH] Prototype mode ready. No config-based project files will be loaded.");
      return null;
    }

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const config = await response.json();
    console.log("[ARCH] Config loaded:", config);

    if (!Array.isArray(config.modules)) throw new Error("[ARCH] config.modules must be an array");
    console.log(`[ARCH] Found ${config.modules.length} module(s)`);
    for (const moduleName of config.modules) await loadModule(moduleName);
    console.log("[ARCH] All modules loaded successfully");

    const initURL = "./arch/init.js";
    console.log("[ARCH] Looking for init.js...");
    const initResponse = await fetch(initURL);

    if (initResponse.ok) {
      console.log("[ARCH] Executing init.js as an ES module...");
      const initModule = await import(new URL(initURL, window.location.href).href);
      const exportedNames = Object.keys(initModule);
      for (const exportName of exportedNames) globalThis[exportName] = initModule[exportName];
      console.log(`[ARCH] init.js exported ${exportedNames.length} binding(s):`, exportedNames);
      console.log("[ARCH] init.js executed successfully");
    } else if (initResponse.status === 404) {
      console.warn("[ARCH] No arch/init.js found. It is recommended to put all ARCH setup scripts in arch/init.js so that dependencies are initialized before your main JavaScript files.");
    } else {
      console.warn(`[ARCH] Failed to load arch/init.js: HTTP ${initResponse.status}`);
    }

    if (!config.js) {
      console.warn('[ARCH] No "js" property found in config.json. No project JavaScript files will be executed.');
      console.log("[ARCH] Project startup complete");
      return config;
    }

    const jsFiles = Array.isArray(config.js) ? config.js : [config.js];
    console.log(`[ARCH] Found ${jsFiles.length} project JavaScript file(s)`);

    const jsResults = await Promise.all(jsFiles.map(async jsFile => {
      console.log(`[ARCH] Fetching: ${jsFile}`);
      try {
        const jsResponse = await fetch(jsFile);
        if (!jsResponse.ok) {
          console.error(`[ARCH] Failed to fetch project JavaScript "${jsFile}": HTTP ${jsResponse.status}`);
          return null;
        }
        const jsCode = await jsResponse.text();
        console.log(`[ARCH] Fetched ${jsFile} (${jsCode.length} bytes)`);
        return { file: jsFile, code: jsCode };
      } catch (error) {
        console.error(`[ARCH] Failed to fetch project JavaScript "${jsFile}":`, error);
        return null;
      }
    }));

    console.log("[ARCH] Executing project JavaScript files...");
    for (const result of jsResults) {
      if (!result) continue;
      const { file, code } = result;
      console.log(`[ARCH] Executing project JavaScript: ${file}`);
      const jsScript = document.createElement("script");
      jsScript.textContent = code;
      (document.head || document.body || document.documentElement).appendChild(jsScript);
      console.log(`[ARCH] Project JavaScript executed successfully: ${file}`);
    }

    console.log("[ARCH] Project startup complete");
    return config;
  } catch (error) {
    console.error("[ARCH] Failed to start project:", error);
    throw error;
  }
}

const __ARCH_READY = getConfigValue();
__ARCH_BOOTSTRAP.ready = __ARCH_READY;
