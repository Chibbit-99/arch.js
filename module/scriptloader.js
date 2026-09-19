async function importScript(scriptPath) {
    const scriptType = scriptPath.split(".").pop().toLowerCase();

    let compilerFunction;

    if (scriptType === "ts") {
        const compilerResponse = await fetch(
            "https://chibbit-99.github.io/arch.js/module/scriptloader/ts.js"
        );

        if (!compilerResponse.ok) {
            throw new Error(
                `[ARCH] Failed to load TypeScript compiler: HTTP ${compilerResponse.status}`
            );
        }

        const compilerCode = await compilerResponse.text();

        eval(compilerCode);

        compilerFunction = globalThis.compileTypeScript;
    } else {
        throw new Error(
            `[ARCH] Unsupported script type: .${scriptType}`
        );
    }

    if (typeof compilerFunction !== "function") {
        throw new Error(
            `[ARCH] Compiler for .${scriptType} did not provide a compiler function.`
        );
    }

    const response = await fetch(scriptPath);

    if (!response.ok) {
        throw new Error(
            `[ARCH] Failed to load script "${scriptPath}": HTTP ${response.status}`
        );
    }

    const source = await response.text();

    console.log(`[ARCH] Compiling ${scriptPath} as .${scriptType}`);

    const compiledCode = await compilerFunction(source, scriptPath);

    if (typeof compiledCode !== "string") {
        throw new Error(
            `[ARCH] Compiler for .${scriptType} did not return JavaScript code.`
        );
    }

    console.log(
        `[ARCH] Compiled ${scriptPath} (${compiledCode.length} bytes)`
    );

    const script = document.createElement("script");
    script.textContent = compiledCode;

    (document.head || document.body || document.documentElement)
        .appendChild(script);

    console.log(`[ARCH] Executed compiled script: ${scriptPath}`);

    return compiledCode;
}
