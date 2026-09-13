async function getConfigValue() {
  try {
    // ==================================================
    // Load config.json
    // ==================================================

    console.log("[ARCH] Loading config.json...");

    const response = await fetch("./arch/config.json");

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const config = await response.json();

    console.log("[ARCH] Config loaded:", config);

    // Make sure modules exists and is an array
    if (!Array.isArray(config.modules)) {
      throw new Error("[ARCH] config.modules must be an array");
    }

    console.log(`[ARCH] Found ${config.modules.length} module(s)`);

    // ==================================================
    // Load ARCH modules
    // ==================================================

    for (const moduleName of config.modules) {
      const url =
        `https://chibbit-99.github.io/arch.js/module/${moduleName}`;

      console.log(`[ARCH] Loading module: ${moduleName}`);
      console.log(`[ARCH] Fetching: ${url}`);

      const moduleResponse = await fetch(url);

      if (!moduleResponse.ok) {
        console.error(
          `[ARCH] Failed to fetch ${moduleName}: HTTP ${moduleResponse.status}`
        );
        continue;
      }

      const code = await moduleResponse.text();

      console.log(
        `[ARCH] Fetched ${moduleName} (${code.length} bytes)`
      );

      const script = document.createElement("script");

      script.textContent = code;

      console.log(`[ARCH] Injecting module: ${moduleName}`);

      document.body.appendChild(script);

      console.log(`[ARCH] Module loaded: ${moduleName}`);
    }

    console.log("[ARCH] All modules loaded successfully");

    // ==================================================
    // Load arch/init.js
    // ==================================================

    const initURL = "./arch/init.js";

    console.log("[ARCH] Looking for init.js...");

    const initResponse = await fetch(initURL);

    if (initResponse.ok) {
      const initCode = await initResponse.text();

      console.log(
        `[ARCH] Fetched init.js (${initCode.length} bytes)`
      );

      console.log("[ARCH] Executing init.js as an ES module...");

      // Execute init.js as a real ES module so it can use named
      // exports and top-level await. The module namespace is then
      // projected onto globalThis so every project JavaScript
      // file can use exported init bindings without importing them.
      //
      // Using the real init.js URL (rather than a Blob URL) also
      // means relative imports inside init.js continue to resolve
      // relative to ./arch/init.js normally.
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

    // ==================================================
    // Load project JavaScript files
    // ==================================================

    if (!config.js) {
      console.warn(
        '[ARCH] No "js" property found in config.json. No project JavaScript files will be executed.'
      );

      return config;
    }

    // Support both:
    //
    // "js": "./src/main.js"
    //
    // and:
    //
    // "js": [
    //   "./src/components.js",
    //   "./src/main.js"
    // ]

    const jsFiles = Array.isArray(config.js)
      ? config.js
      : [config.js];

    console.log(
      `[ARCH] Found ${jsFiles.length} project JavaScript file(s)`
    );

    // ==================================================
    // Fetch all project JavaScript files concurrently
    // ==================================================

    console.log("[ARCH] Fetching project JavaScript files...");

    const jsResults = await Promise.all(
      jsFiles.map(async (jsFile) => {
        console.log(`[ARCH] Fetching: ${jsFile}`);

        try {
          const jsResponse = await fetch(jsFile);

          if (!jsResponse.ok) {
            console.error(
              `[ARCH] Failed to fetch project JavaScript "${jsFile}": HTTP ${jsResponse.status}`
            );

            return null;
          }

          const jsCode = await jsResponse.text();

          console.log(
            `[ARCH] Fetched ${jsFile} (${jsCode.length} bytes)`
          );

          return {
            file: jsFile,
            code: jsCode
          };

        } catch (error) {
          console.error(
            `[ARCH] Failed to fetch project JavaScript "${jsFile}":`,
            error
          );

          return null;
        }
      })
    );

    // ==================================================
    // Execute project JavaScript files in config order
    // ==================================================

    console.log("[ARCH] Executing project JavaScript files...");

    for (const result of jsResults) {
      if (!result) {
        continue;
      }

      const { file, code } = result;

      console.log(
        `[ARCH] Executing project JavaScript: ${file}`
      );

      const jsScript = document.createElement("script");

      jsScript.textContent = code;

      document.body.appendChild(jsScript);

      console.log(
        `[ARCH] Project JavaScript executed successfully: ${file}`
      );
    }

    // ==================================================
    // Finished
    // ==================================================

    console.log("[ARCH] Project startup complete");

    return config;

  } catch (error) {
    console.error("[ARCH] Failed to start project:", error);
  }
}

getConfigValue();
