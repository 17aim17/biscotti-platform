import { config } from "@workspace/eslint-config/base"

// Business logic stays framework-free so it can be reused outside Next.js
// (for example behind a REST API for mobile apps later).
export default [
  ...config,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*"],
              message: "core must not depend on Next.js.",
            },
            {
              group: ["react", "react-dom"],
              message: "core must not depend on React.",
            },
            {
              group: ["@workspace/ui", "@workspace/ui/*"],
              message: "core must not depend on UI.",
            },
          ],
        },
      ],
    },
  },
]
