let __ARCH_TS_COMPILER = null;

async function getTypeScriptCompiler() {
    if (__ARCH_TS_COMPILER) {
        return __ARCH_TS_COMPILER;
    }

    if (typeof globalThis.importPackage !== "function") {
        throw new Error(
            "[ARCH] TypeScript compiler requires importPackage()."
        );
    }

    console.log("[ARCH] Loading TypeScript compiler...");

    const [typescript, tsvfs] = await Promise.all([
        globalThis.importPackage("typescript"),
        globalThis.importPackage("@typescript/vfs")
    ]);

    __ARCH_TS_COMPILER = { typescript, tsvfs };

    console.log(
        `[ARCH] TypeScript ${typescript.version} loaded`
    );

    return __ARCH_TS_COMPILER;
}

function normalizeFilename(filename) {
    try {
        const url = new URL(filename, window.location.href);
        return url.pathname || "/main.ts";
    } catch {
        return filename.startsWith("/") ? filename : "/" + filename;
    }
}

function formatDiagnostics(ts, diagnostics, filename) {
    if (!diagnostics.length) {
        return "";
    }

    return ts.formatDiagnosticsWithColorAndContext(
        diagnostics,
        {
            getCanonicalFileName: fileName => fileName,
            getCurrentDirectory: () => "/",
            getNewLine: () => "\n"
        }
    );
}

globalThis.compileTypeScript = async function compileTypeScript(
    source,
    filename = "main.ts"
) {
    const { typescript: ts, tsvfs } = await getTypeScriptCompiler();

    const compilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        jsx: ts.JsxEmit.Preserve,
        strict: true,
        noEmitOnError: true,
        skipLibCheck: true,
        sourceMap: false
    };

    const virtualFilename = normalizeFilename(filename);

    console.log(
        `[ARCH] Type-checking TypeScript: ${filename}`
    );

    const fsMap = await tsvfs.createDefaultMapFromCDN(
        compilerOptions,
        ts.version,
        true,
        ts
    );

    fsMap.set(virtualFilename, source);

    const system = tsvfs.createSystem(fsMap);
    const host = tsvfs.createVirtualCompilerHost(
        system,
        compilerOptions,
        ts
    );

    const program = ts.createProgram({
        rootNames: [virtualFilename],
        options: compilerOptions,
        host: host.compilerHost
    });

    const diagnostics = [
        ...program.getSyntacticDiagnostics(
            program.getSourceFile(virtualFilename)
        ),
        ...program.getSemanticDiagnostics(
            program.getSourceFile(virtualFilename)
        )
    ];

    if (diagnostics.length) {
        const formatted = formatDiagnostics(
            ts,
            diagnostics,
            filename
        );

        console.error(
            `[ARCH] TypeScript compilation failed for ${filename}:\n${formatted}`
        );

        throw new Error(
            `[ARCH] TypeScript compilation failed for ${filename}.\n${formatted}`
        );
    }

    let javascript = null;

    const emitResult = program.emit(
        undefined,
        (outputFileName, outputText) => {
            if (outputFileName.endsWith(".js")) {
                javascript = outputText;
            }
        }
    );

    if (emitResult.diagnostics.length) {
        const formatted = formatDiagnostics(
            ts,
            emitResult.diagnostics,
            filename
        );

        throw new Error(
            `[ARCH] TypeScript emit failed for ${filename}.\n${formatted}`
        );
    }

    if (javascript === null) {
        throw new Error(
            `[ARCH] TypeScript produced no JavaScript output for ${filename}.`
        );
    }

    return javascript;
};
