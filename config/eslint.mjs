/** The visuals' lint config; takes the eslint-plugin-powerbi-visuals import so Core does not depend on it */
export default function eslintConfig(powerbiVisualsConfigs) {
  return [
    powerbiVisualsConfigs.configs.recommended,
    {
      ignores: [
        "node_modules/**",
        "dist/**",
        ".vscode/**",
        ".tmp/**",
        "test/**",
        "coverage/**",
        "docs/**"
      ]
    }
  ];
}
