import { fileURLToPath } from "node:url";

const coreSource = fileURLToPath(new URL("../src/", import.meta.url));
const tsconfig = fileURLToPath(new URL("tsconfig.bundle.json", import.meta.url));
const terserOptions = { compress: { passes: 2 }, format: { comments: false } };

// The visuals import Core by package name; Core's frontends import its other modules by relative path
const visualImports = source => /^powerbi-visuals-core\//.test(source);
const coreImports = (source, importer) => importer?.startsWith(coreSource) === true && source.startsWith(".");
const externals = { ccCore: undefined, spc: visualImports, funnel: visualImports, ccHeadless: coreImports, ccInteractive: coreImports, minidom: undefined };

/**
 * The frontends' IIFE bundles, from `powerbi-spc` and `powerbi-funnels` installed beside Core; takes the rollup plugins
 * so Core does not depend on them. `outputs` maps each bundle to build to its files, minified when named `.min.js`.
 */
export default function bundleConfig({ typescript, nodeResolve, commonjs, json, terser }, outputs) {
  const names = Object.keys(outputs);
  const configs = new Array(names.length);
  for (let i = 0; i < names.length; i++) {
    if (!(names[i] in externals)) {
      throw new Error(`Unknown bundle: ${names[i]}`);
    }
    const files = outputs[names[i]];
    const output = new Array(files.length);
    for (let j = 0; j < files.length; j++) {
      const minify = files[j].endsWith(".min.js");
      output[j] = { format: "iife", name: names[i], file: files[j], globals: () => "ccCore", plugins: minify ? [terser(terserOptions)] : [] };
    }
    configs[i] = {
      input: fileURLToPath(new URL(`bundle/${names[i]}.ts`, import.meta.url)),
      external: externals[names[i]],
      output,
      plugins: [typescript({ tsconfig }), json(), nodeResolve({ browser: true }), commonjs()]
    };
  }
  return configs;
}
