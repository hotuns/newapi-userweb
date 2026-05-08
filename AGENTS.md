<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# New API response source of truth

For any integration, debugging, or UI design work that depends on New API response fields, do not guess from frontend types or existing rendered text alone. Read the `origin/new-api` source implementation first and treat that Go code as the canonical reference for response shape, field semantics, and status behavior.

`origin/new-api` is a source-code reference, not something that must be added to this repo's git management. When it is available in the local environment, inspect it directly before changing parsing, formatting, or detail layouts that depend on API payloads.
