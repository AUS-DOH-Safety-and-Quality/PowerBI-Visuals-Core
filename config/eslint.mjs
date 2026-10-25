const arrayCallbacks = "map|forEach|filter|reduce|reduceRight|some|every|find|findIndex|findLast|findLastIndex|flatMap";
const typedFiles = ["src/**/*.ts", "test/**/*.ts"];

/** Core's import direction: util ← math, data ← spc, settings (type-only) ← powerbi ← rendering ← frontends; testing sits beside */
const importDirection = [
  { files: ["src/util/**/*.ts"], forbid: "^\\.\\./", allowTypeImports: false },
  { files: ["src/math/**/*.ts", "src/data/**/*.ts"], forbid: "^\\.\\./(?!util)", allowTypeImports: false },
  { files: ["src/spc/**/*.ts", "src/settings/**/*.ts"], forbid: "^\\.\\./(?!util)", allowTypeImports: true },
  { files: ["src/powerbi/**/*.ts"], forbid: "^\\.\\./(spc|rendering|frontends|testing)", allowTypeImports: false },
  { files: ["src/rendering/**/*.ts"], forbid: "^\\.\\./(frontends|testing)", allowTypeImports: false },
  { files: ["src/frontends/**/*.ts"], forbid: "^\\.\\./testing", allowTypeImports: false }
];

function importDirectionConfigs() {
  const configs = [];
  for (let i = 0; i < importDirection.length; i++) {
    const { files, forbid, allowTypeImports } = importDirection[i];
    configs.push({
      files,
      rules: {
        "@typescript-eslint/no-restricted-imports": ["error", {
          patterns: [{ regex: forbid, allowTypeImports, message: "Against Core's module import direction (see AGENTS.md)." }]
        }]
      }
    });
  }
  return configs;
}

/**
 * The visuals' lint config; takes the @eslint/js, eslint-plugin-powerbi-visuals and typescript-eslint imports so Core
 * does not depend on them. parserOptions names the tsconfig covering src and test, for the type-aware rules.
 */
export default function eslintConfig(powerbiVisualsConfigs, js, tseslint, parserOptions) {
  const typed = [];
  for (let i = 0; i < tseslint.configs.strictTypeChecked.length; i++) {
    typed.push({ ...tseslint.configs.strictTypeChecked[i], files: typedFiles });
  }
  for (let i = 0; i < tseslint.configs.stylisticTypeChecked.length; i++) {
    typed.push({ ...tseslint.configs.stylisticTypeChecked[i], files: typedFiles });
  }
  return [
    { linterOptions: { reportUnusedDisableDirectives: "error" } },
    js.configs.recommended,
    powerbiVisualsConfigs.configs.recommended,
    {
      rules: {
        // TypeScript checks these, and the core rules misread type-only syntax
        "no-undef": "off",
        "no-redeclare": "off",
        "no-unused-vars": "off",
        // Constants ported from R keep their published digits
        "no-loss-of-precision": "off",
        "curly": ["error", "all"],
        "one-var": ["error", "never"],
        "max-statements-per-line": ["error", { max: 1 }],
        "prefer-const": "error",
        "eqeqeq": ["error", "always", { null: "ignore" }],
        "no-console": ["error", { allow: ["warn", "error"] }],
        "no-nested-ternary": "error",
        "no-restricted-syntax": ["error",
          { selector: "TSEnumDeclaration", message: "Use a union of literal types instead of an enum." },
          { selector: `CallExpression[callee.property.name=/^(${arrayCallbacks})$/]`, message: "Use an indexed for loop instead of an array callback." },
          { selector: "ForOfStatement", message: "Use an indexed for loop instead of for-of." },
          { selector: "ForInStatement", message: "Use an indexed for loop over Object.keys instead of for-in." }
        ]
      }
    },
    ...typed,
    {
      files: typedFiles,
      languageOptions: { parserOptions },
      rules: {
        "@typescript-eslint/prefer-for-of": "off",
        "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
        "@typescript-eslint/strict-boolean-expressions": ["error", { allowNullableBoolean: true, allowNullableString: true, allowNumber: false }],
        "@typescript-eslint/switch-exhaustiveness-check": ["error", { considerDefaultExhaustiveForUnions: true }],
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/explicit-function-return-type": ["error", { allowExpressions: true, allowTypedFunctionExpressions: true, allowHigherOrderFunctions: true }],
        "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        // Math ports annotate every binding as R does
        "@typescript-eslint/no-inferrable-types": "off",
        // Fake hosts take no-op callbacks
        "@typescript-eslint/no-empty-function": "off",
        // `!` is banned, so narrowing stays explicit
        "@typescript-eslint/non-nullable-type-assertion-style": "off",
        // `||` on strings deliberately treats "" as absent (textContent, namespaceURI)
        "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { string: true } }],
        // Casts only at untyped boundaries, each with a disable comment giving the reason
        "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as", objectLiteralTypeAssertions: "never" }],
        "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
        // Record<never, never> defaults deliberately mean no extra settings
        "@typescript-eslint/no-generated-empty-object-type": "off"
      }
    },
    ...importDirectionConfigs(),
    {
      files: ["src/**/*.ts"],
      rules: {
        // With noUncheckedIndexedAccess on, a check the compiler can prove redundant is noise
        "@typescript-eslint/no-unnecessary-condition": "error"
      }
    },
    {
      files: ["src/settings/**/*.ts"],
      rules: {
        // Option builders return inferred literal schemas that the settings types are derived from
        "@typescript-eslint/explicit-function-return-type": "off"
      }
    },
    {
      files: ["test/**/*.ts"],
      rules: {
        // The test program has noUncheckedIndexedAccess off, so fixture checks would read as unnecessary
        "@typescript-eslint/no-unnecessary-condition": "off",
        // Spies and mock assertions take methods unbound
        "@typescript-eslint/unbound-method": "off",
        // Test helpers return inferred fixtures
        "@typescript-eslint/explicit-function-return-type": "off"
      }
    },
    {
      files: ["test/**/*.types.ts"],
      rules: {
        // Type tests declare and read values only to check that they compile
        "@typescript-eslint/no-unused-expressions": "off",
        "@typescript-eslint/no-unused-vars": "off"
      }
    },
    {
      ignores: [
        "node_modules/**",
        "dist/**",
        ".vscode/**",
        ".tmp/**",
        "coverage/**",
        "docs/**"
      ]
    }
  ];
}
