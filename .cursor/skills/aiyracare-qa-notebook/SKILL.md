---
name: aiyracare-qa-notebook
description: Run real E2E QA on My Machines (NotebookRafael)—git pull, migrations, up.ps1, QA_TEST_* creds, qa:run and qa:run-all regression; AIYRA_NO_RTK for debug. Use for tier ≥1 DoD after merge—not Cloud VM pre-flight alone.
---

# AiyraCare — QA notebook (My Machines)

**Target environment:** Windows checkout `C:\Users\rafae\workspace\aiyra-care`, worker **`NotebookRafael`** ([`docs/CURSOR_WORKSPACE.md`](../../docs/CURSOR_WORKSPACE.md)).

Cloud Agent **pre-flight** `npm run qa:run` does **not** satisfy tier ≥1 Definition of Done ([`docs/CURSOR_WORK_MODEL.md`](../../docs/CURSOR_WORK_MODEL.md), [`FOCO_ATUAL.md`](../../docs/FOCO_ATUAL.md)).

Use **`computerUse`** / local terminal only on My Machines—never claim notebook PASS from Cloud VM without PG + Supabase local stack.

## Definition of Done (E2E real)

| Tier | Accept |
|------|--------|
| ≥1 feature | Suite from feature card **PASS** on notebook **or** CI job `e2e-regression` green on merge commit |
| Gate `main` | `npm run qa:run-all -- --lane regression` PASS (notebook or CI) |
| Ops lane | `npm run test:ops` when CH/pipeline changed |

Report **PASS/FAIL** in chat, PR comment, or `HISTORICO`—include suite ids and commit SHA.

## Ritual (ordem)

### 1. Sync repo

```powershell
cd C:\Users\rafae\workspace\aiyra-care
git fetch origin main
git pull origin main
```

Confirm at or after commit noted in [`FOCO_ATUAL.md`](../../docs/FOCO_ATUAL.md) (ex.: `pull` ≥ `2111042`).

### 2. Migrations

Apply pending SQL scripts for this checkout (check `database/relational/` and [`FOCO_ATUAL.md`](../../docs/FOCO_ATUAL.md) — e.g. **089**):

```powershell
node packages/api/scripts/apply-migration-089.mjs
# repeat for any newer NNN called out in FOCO / PR
```

Use `.env` pointing at local PG `postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare` ([`AGENTS.md`](../../AGENTS.md)).

### 3. Stack up

```powershell
taskkill /F /IM node.exe 2>&1 | Out-Null
Start-Sleep 2
powershell -File "$env:USERPROFILE\workspace\aiyra-care\scripts\up.ps1" *>$null
```

Verify: `http://127.0.0.1:3010/health`, web `http://localhost:5173`.

### 4. Credenciais `QA_TEST_*`

Never commit secrets. See [`docs/testing/AUTH_TESTING.md`](../../docs/testing/AUTH_TESTING.md).

```powershell
npm run qa:create-test-user
# onboarding-dedicated flows:
npm run qa:create-onboarding-user
npm run qa:reset-onboarding-user   # before onboarding E2E
```

File: `packages/web/.env.e2e.local` (from `.env.e2e.example`):

```env
QA_TEST_EMAIL=...
QA_TEST_PASSWORD=...
```

Playwright helper: `packages/web/e2e/helpers/login.ts` (`loginViaPassword`).

### 5. Run suites

Feature scope (from feature card QA section):

```powershell
npm run qa:run -- --suite <suite-id>
```

Regressão núcleo (gate pré-`main` / pós-wave):

```powershell
npm run qa:run-all -- --lane regression
```

J1 bundle (go-live pillar 2): `auth-entry-flow`, `onboarding-flow`, `core-patient-crud`, `dashboard-people-grouping`, plus `patient-wallet` when in scope ([`MVP_GO_LIVE_CHECKLIST.md`](../../docs/product/MVP_GO_LIVE_CHECKLIST.md)).

Optional Playwright direct:

```powershell
cd packages/web
npm run test:e2e -- e2e/suites/<id>.spec.ts
```

### 6. RTK / debug

QA commands are **RTK bypass** by default ([`docs/CURSOR_RTK.md`](../../docs/CURSOR_RTK.md)). If output looks truncated or flaky:

```powershell
$env:AIYRA_NO_RTK=1
npm run qa:run -- --suite <id>
```

Use full output for root-cause before fixing product code.

## Lanes

| Lane | Command |
|------|---------|
| `#produto` | Feature `qa:run` + regression gate when closing MVP/J1 |
| `#ops` | `npm run test:ops`, `npm run ops:smoke` per change |

Full business sweep: `npm run qa:run-all -- --lane business-full` (hours—parallelize per [`QA_PROCESS.md`](../../docs/testing/QA_PROCESS.md)).

## Output template

```markdown
## Notebook QA — {date}
- **Commit:** {sha}
- **Migrations:** {NNN…}
- **Suites:** {ids} → **PASS** | **FAIL**
- **Regression lane:** PASS | FAIL | skipped
- **Notes:** (flake, env, follow-up PR)
```

## References

- Process: [`docs/testing/QA_PROCESS.md`](../../docs/testing/QA_PROCESS.md)
- Workspace worker: [`docs/CURSOR_WORKSPACE.md`](../../docs/CURSOR_WORKSPACE.md)
- Wave tracking after PASS: **`aiyracare-wave-closeout`**
