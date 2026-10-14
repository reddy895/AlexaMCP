# Security Architecture & Threat Model

The Alexa + MCP Question-Answering Assistant is designed with strict production-minded defaults. It enforces boundary isolation, input sanitization, and cryptographic safety in backend application code rather than relying on LLM self-governance.

---

## 1. Threat Model & Trust Boundaries

```
[Untrusted Network / Client / Retried Docs]
                     │
          (TLS Reverse Proxy / Ingress)
                     │
                     ▼
  ┌─────────────────────────────────────────┐
  │  TRUST BOUNDARY 1: Network & Auth       │
  │  - Rate Limiter (Token Bucket)          │
  │  - Constant-time Bearer Token Check     │
  │  - Maximum JSON Payload Limit (1MB)     │
  └──────────────────┬──────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────┐
  │  TRUST BOUNDARY 2: Workspace & FS       │
  │  - Workspace Boundary Guard             │
  │  - Path Traversal Block (.. prevention) │
  │  - Hidden Files & Secret Allowlist (.env│
  │    .git, *.pem, *.key strictly blocked) │
  └──────────────────┬──────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────┐
  │  TRUST BOUNDARY 3: LLM & Prompts        │
  │  - Prompt-Injection Defense Envelopes   │
  │  - Retrieved Documents as Untrusted Data│
  │  - Zero Execution of Model-Generated Code
  └──────────────────┬──────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────┐
  │  TRUST BOUNDARY 4: Side Effects         │
  │  - Two-Phase HMAC Confirmation Protocol │
  │  - Mutating actions require signed token│
  │  - Parameterized SQLite Queries (No SQLi│
  │  - Real-time PII & Credential Redaction │
  └─────────────────────────────────────────┘
```

---

## 2. Security Controls Detail

### 2.1 Workspace Boundary & Path Traversal Prevention
- All file inspections and document indexing calls pass through `WorkspaceBoundaryGuard.assertWithinBoundary()`.
- Paths are resolved to canonical absolute paths (`path.resolve`) and checked against the configured workspace root.
- Path traversal sequences (`../`, `..\\`) are detected and rejected with `PermissionDeniedError`.
- System directories (`/etc`, `/usr`, `/root`) and sensitive files (`.env`, `.git`, SSH keys, private certificates) are blocked unconditionally.

### 2.2 Prompt Injection Defense
- Unsanitized user documents, error logs, and tool outputs are treated as untrusted data.
- They are enclosed within explicit, immutable delimiters (`<untrusted_document_evidence>` and `<untrusted_system_error>`) with system instructions stating they must never be interpreted as commands or system directives.

### 2.3 Two-Phase Confirmation Protocol
- Actions that mutate state or delete data (`requiresConfirmation: true`) are halted prior to execution.
- The assistant generates a cryptographically signed confirmation token (`HMAC-SHA256`) bound to the specific `actionId` and `resource`.
- The assistant returns status `confirmation_required` along with the token and description.
- Only when the client re-submits the request with the valid `confirmationToken` is the operation permitted to execute.

### 2.4 Credential & PII Redaction
- Log entries and tool summaries pass through a streaming PII filter.
- Credit card numbers, JWT tokens, AWS access keys, GitHub tokens, Bearer authorization headers, and private keys are replaced with `[REDACTED_*]` masks before serialization.

### 2.5 Constant-Time Authentication
- Bearer tokens are validated using `crypto.timingSafeEqual` over SHA-256 digests. This guarantees invariant execution time and mitigates side-channel timing analysis.

### 2.6 Parameterized SQL Storage
- SQLite persistence uses Node.js 22 native `DatabaseSync` prepared statements. User queries and document contents are strictly bound as parameters, eliminating SQL injection.

---

## 3. Production Deployment Hardening

For production exposure:
1. **TLS Termination**: Place the service behind a reverse proxy (Nginx, Caddy, Cloudflare Tunnel, or AWS ALB) with valid HTTPS certificates. Never expose raw HTTP to the public internet.
2. **Authentication Token**: Generate a cryptographically strong 256-bit secret for `AUTH_TOKEN`:
   ```bash
   openssl rand -hex 32
   ```
3. **Environment Files**: Ensure `.env` is never committed to Git and has permissions `chmod 600 .env`.
