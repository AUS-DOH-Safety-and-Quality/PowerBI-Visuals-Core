const arrayCallbacks = "map|forEach|filter|reduce|reduceRight|some|every|find|findIndex|findLast|findLastIndex|flatMap";
const typedFiles = ["src/**/*.ts", "test/**/*.ts"];

/**
 * The visuals' lint config; takes the @eslint/js, eslint-plugin-powerbi-visuals and typescript-eslint imports so Core
 * does not depend on them. parserOptions names the tsconfig covering src and test, for the type-aware rules.
 */
export default function eslintConfig(powerbiVisualsConfigs, js, tseslint, parserOptions) {
  const typed = [];
  for (let i = 0; i < tseslint.configs.strictTypeChecked.length; i++) {
    typed.push({ ...tseslint.configs.strictTypeChecked[i], files: typedFiles });
  }
  return [
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
        "no-restricted-syntax": ["error",
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
        // Without noUncheckedIndexedAccess, bounds and Power BI null checks read as unnecessary
        "@typescript-eslint/no-unnecessary-condition": "off",
        "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
        "@typescript-eslint/strict-boolean-expressions": ["error", { allowNullableBoolean: true, allowNullableString: true, allowNumber: false }],
        "@typescript-eslint/switch-exhaustiveness-check": ["error", { considerDefaultExhaustiveForUnions: true }],
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
        // Record<never, never> defaults deliberately mean no extra settings
        "@typescript-eslint/no-generated-empty-object-type": "off"
      }
    },
    {
      files: ["test/**/*.ts"],
      rules: {
        // Spies and mock assertions take methods unbound
        "@typescript-eslint/unbound-method": "off"
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
