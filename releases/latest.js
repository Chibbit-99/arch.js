const __ARCH_BOOTSTRAP = {
    ready: null,
    importPackage: null,
    importGlobal: null
};

globalThis.importPackage = (...args) => {
    const call = async () => {
        await __ARCH_BOOTSTRAP.ready;

        if (typeof __ARCH_BOOTSTRAP.importPackage !== "function") {
            throw new Error(
                "[ARCH] importPackage() is unavailable because no loaded ARCH module provides it."
            );
        }

        return __ARCH_BOOTSTRAP.importPackage(...args);
    };

    return call();
};

globalThis.importGlobal = (...args) => {
    const call = async () => {
        await __ARCH_BOOTSTRAP.ready;

        if (typeof __ARCH_BOOTSTRAP.importGlobal !== "function") {
            throw new Error(
                "[ARCH] importGlobal() is unavailable because no loaded ARCH module provides it."
            );
        }

        return __ARCH_BOOTSTRAP.importGlobal(...args);
    };

    return call();
};

async function loadModule(moduleName) {
    const url = `https://chibbit-99.github.io/arch.js/module/${moduleName}`;

    console.log(`[ARCH] Loading module: ${moduleName}`);
    console.log(`[ARCH] Fetching: ${url}`);

    const moduleResponse = await fetch(url);

    if (!moduleResponse.ok) {
        throw new Error(
            `[ARCH] Failed to fetch ${moduleName}: HTTP ${moduleResponse.status}`
        );
    }

    const code = await moduleResponse.text();

    console.log(`[ARCH] Fetched ${moduleName} (${code.length} bytes)`);

    const script = document.createElement("script");
    script.textContent = code;
    (document.head || document.body || document.documentElement).appendChild(script);

    const discoveredImportPackage = globalThis.importPackage;
    const discoveredImportGlobal = globalThis.importGlobal;

    if (typeof discoveredImportPackage === "function" && discoveredImportPackage !== globalThis.__ARCH_PROTO_IMPORT_PACKAGE) {
        __ARCH_BOOTSTRAP.importPackage = discoveredImportPackage;
    }

    if (typeof discoveredImportGlobal === "function" && discoveredImportGlobal !== globalThis.__ARCH_PROTO_IMPORT_GLOBAL) {
        __ARCH_BOOTSTRAP.importGlobal = discoveredImportGlobal;
    }

    console.log(`[ARCH] Module loaded: ${moduleName}`);
}

async function discoverAndLoadModules() {
    console.log("[ARCH] Discovering available ARCH modules...");

    const response = await fetch(
        "https://api.github.com/repos/Chibbit-99/arch.js/contents/module?ref=main"
    );

    if (!response.ok) {
        throw new Error(
            `[ARCH] Could not discover ARCH modules: HTTP ${response.status}`
        );
    }

    const entries = await response.json();

    const moduleNames = entries
        .filter(entry =>
            entry &&
            entry.type === "file" &&
            typeof entry.name === "string" &&
            entry.name.endsWith(".js")
        )
        .map(entry => entry.name)
        .sort();

    console.log(`[ARCH] Discovered ${moduleNames.length} module(s)`);

    for (const moduleName of moduleNames) {
        await loadModule(moduleName);
    }

    console.log("[ARCH] All discovered modules loaded successfully");
}

async function startARCH() {
    console.log("[ARCH] Loading config.json...");

    let response;

    try {
        response = await fetch("./arch/config.json");
    } catch (error) {
        console.warn(
            "[ARCH] Could not access arch/config.json. Falling back to prototype mode.",
            error
        );
        response = null;
    }

    if (!response || response.status === 404) {
        const docsURL = "https://chibbit-99.github.io/arch.js/docs/";

        console.warn(
            "[ARCH] No arch/config.json found. Falling back to automatic module discovery. " +
            "This approach is intended for development only and should not be used in production. " +
            `See the ARCH.js docs: ${docsURL}`
        );

        await discoverAndLoadModules();

        console.log(
            "[ARCH] Prototype mode ready. No config-based project files will be loaded."
        );

        return null;
    }

    if (!response.ok) {
        throw new Error(`[ARCH] Failed to load config.json: HTTP ${response.status}`);
    }

    const config = await response.json();

    console.log("[ARCH] Config loaded:", config);

    if (!Array.isArray(config.modules)) {
        throw new Error("[ARCH] config.modules must be an array");
    }

    console.log(`[ARCH] Found ${config.modules.length} module(s)`);

    for (const moduleName of config.modules) {
        await loadModule(moduleName);
    }

    console.log("[ARCH] All modules loaded successfully");

    const initURL = "./arch/init.js";

    console.log("[ARCH] Looking for init.js...");

    const initResponse = await fetch(initURL);

    if (initResponse.ok) {
        console.log("[ARCH] Executing init.js as an ES module...");

        const initModule = await import(
            new URL(initURL, window.location.href).href
        );

        const exportedNames = Object.keys(initModule);

        for (const exportName of exportedNames) {
            globalThis[exportName] = initModule[exportName];
        }

        console.log(
            `[ARCH] init.js exported ${exportedNames.length} binding(s):`,
            exportedNames
        );

        console.log("[ARCH] init.js executed successfully");
    } else if (initResponse.status === 404) {
        console.warn(
            "[ARCH] No arch/init.js found. It is recommended to put all ARCH setup scripts in arch/init.js so that dependencies are initialized before your main JavaScript files."
        );
    } else {
        console.warn(
            `[ARCH] Failed to load arch/init.js: HTTP ${initResponse.status}`
        );
    }

    if (!config.js) {
        console.warn(
            '[ARCH] No "js" property found in config.json. No project JavaScript files will be executed.'
        );
        console.log("[ARCH] Project startup complete");
        return config;
    }

    const jsFiles = Array.isArray(config.js) ? config.js : [config.js];

    console.log(`[ARCH] Found ${jsFiles.length} project JavaScript file(s)`);

    for (const jsFile of jsFiles) {
        console.log(`[ARCH] Fetching: ${jsFile}`);

        const jsResponse = await fetch(jsFile);

        if (!jsResponse.ok) {
            console.error(
                `[ARCH] Failed to fetch project JavaScript "${jsFile}": HTTP ${jsResponse.status}`
            );
            continue;
        }

        const jsCode = await jsResponse.text();

        console.log(`[ARCH] Fetched ${jsFile} (${jsCode.length} bytes)`);
        console.log(`[ARCH] Executing project JavaScript: ${jsFile}`);

        const jsScript = document.createElement("script");
        jsScript.textContent = jsCode;
        (document.head || document.body || document.documentElement).appendChild(jsScript);

        console.log(`[ARCH] Project JavaScript executed successfully: ${jsFile}`);
    }

    console.log("[ARCH] Project startup complete");

    return config;
}

const __ARCH_BOOTSTRAP_READY = startARCH();
__ARCH_BOOTSTRAP.ready = __ARCH_BOOTSTRAP_READY;
