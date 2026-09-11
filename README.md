# ARCH.js

Arch.js is a lightweight browser runtime for loading project JavaScript from a simple configuration file and importing NPM packages directly in the browser.

It is designed for experimenting with a more flexible browser runtime without needing a traditional build setup for the project itself.

## Try it

**Documentation:** https://chibbit-99.github.io/arch.js/docs/

**Three.js demo:** https://chibbit-99.github.io/arch.js/demo/threejs/

**Project site:** https://chibbit-99.github.io/arch.js/

## Quick start

Create a page that loads the latest ARCH.js release:

```html
<!doctype html>
<html>
<body>
    <script src="https://chibbit-99.github.io/arch.js/releases/latest.js"></script>
</body>
</html>
```

The `releases/latest.js` file is the current development release and may change as ARCH.js is updated. For a fixed release, use its versioned file instead, such as `releases/v0.1.0-alpha.js`.

Then give the page an `arch/` directory:

```text
my-project/
├── index.html
├── arch/
│   ├── config.json
│   └── init.js
└── src/
    └── main.js
```

### `arch/config.json`

```json
{
  "modules": ["npmloader.js"],
  "js": ["./src/main.js"]
}
```

`modules` tells arch.js which runtime modules to load. `js` tells it which project JavaScript files to execute. `js` can be either one string or an array.

### `src/main.js`

Normal browser JavaScript works as the project entry point:

```js
console.log("Hello from arch.js");
```

Open `index.html` through a web server/static host and arch.js will load the configuration and start the project.

## Releases

ARCH.js keeps its browser-ready runtime builds in `releases/`.

```text
releases/
├── latest.js
├── v0.1.0-alpha.js
└── v0.1.1-alpha.js
```

`latest.js` is the file updated for ongoing development. When a version is released, a copy is created with that version's tag name, giving that release a fixed runtime file that does not change when `latest.js` is updated.

For example:

```html
<script src="https://chibbit-99.github.io/arch.js/releases/latest.js"></script>
```

or for a pinned release:

```html
<script src="https://chibbit-99.github.io/arch.js/releases/v0.1.0-alpha.js"></script>
```

This lets projects either follow the latest ARCH.js build or deliberately pin themselves to a specific release.

## Changelog

### v0.1.1-alpha

- Added the `releases/` architecture for browser-ready runtime builds.
- Added versioned release files alongside `releases/latest.js`.
- Updated demos to load ARCH.js from `releases/latest.js`.
- Added automatic release-file generation through GitHub Actions when a version tag is created.
- Updated the README to document the new release structure.

### v0.1.0-alpha

- Initial alpha release of ARCH.js.
- Browser runtime with project configuration and JavaScript loading.
- NPM package loading through `importPackage()`.
- Global export support through `importGlobal()`.
- Modular runtime architecture.

## Import an NPM package

Add `npmloader.js` to your modules and use `importPackage()` from your project code or `arch/init.js`:

```json
{
  "modules": ["npmloader.js"],
  "js": ["./src/main.js"]
}
```

```js
const three = await importPackage("three");

const scene = new three.Scene();
console.log(scene);
```

The loader resolves the package through the NPM registry, handles its package files and dependencies, bundles it for the browser, and returns the resulting module namespace.

Versioned requests and subpaths are supported:

```js
const three = await importPackage("three@0.180.0");
const helpers = await importPackage("some-package/helpers");
```

## Use `arch/init.js`

`arch/init.js` is optional, but it is useful for dependency setup that should happen before your main project files execute.

```js
const THREE = await importPackage("three");

globalThis.THREE = THREE;
```

arch.js waits for `arch/init.js` to finish before executing the files listed in `config.json`.

## Make an export global

After importing a package, `importGlobal()` can place one of its exports on `globalThis`:

```js
await importPackage("three");

importGlobal("three", "ArrowHelper");
```

You can also give the global a different name:

```js
importGlobal("three", "Vector3", "Vec3");
```

`importGlobal()` does not load the package itself. The package must already have been imported with `await importPackage(...)`.

## Multiple project files

`config.json` can contain several project files:

```json
{
  "modules": ["npmloader.js"],
  "js": [
    "./src/components.js",
    "./src/main.js"
  ]
}
```

arch.js fetches the project files concurrently and executes them in the order listed in `js`.

## Reusable arch modules

Runtime functionality is kept in the `module/` directory. A module listed in `config.modules` is loaded before `arch/init.js`.

For example, the repository currently ships `module/npmloader.js`, which provides the NPM package loading API.

A module can therefore be enabled per project instead of putting every feature into the core runtime.

## Existing examples

### Minimal demo

`demo/arch/` shows the basic project structure with:

```text
demo/arch/
├── config.json
├── init.js
└── src/
    └── main.js
```

Open it at https://chibbit-99.github.io/arch.js/demo/

### Three.js demo

`demo/threejs/` uses the same structure and imports Three.js through arch.js. Its project code then builds a full browser 3D scene.

Open it at https://chibbit-99.github.io/arch.js/demo/threejs/

## Debugging

arch.js writes startup and package-loading information to the browser console with an `[arch]` prefix.

The NPM loader also exposes `ARCH` for inspection:

```js
console.log(ARCH);
```

Imported packages are cached, so repeating the same package specifier can reuse the existing module.

## Important notes

arch.js is a browser runtime, not a replacement for every Node.js feature. Packages that depend on Node-only built-ins or unsupported package protocols may not work in the browser.

Package resolution is designed around browser use and currently handles common `exports`, `browser`, `module`, `main`, dependency, semver, ESM, and CommonJS cases.

## Documentation

For the full usage guide and API reference:

https://chibbit-99.github.io/arch.js/docs/

## License

See the repository for the current license and project status.


