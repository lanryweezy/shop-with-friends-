# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verify_dashboard.spec.ts >> verify merchant dashboard security and snippet
- Location: verify_dashboard.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="Enter API Key"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:react-babel] /app/components/MerchantDashboard.tsx: Unterminated JSX contents. (190:14) 193 |"
  - generic [ref=e5]: /app/components/MerchantDashboard.tsx:190:14
  - generic [ref=e6]: "188| </div> 189| )} 190| </div> | ^ 191| ); 192| };"
  - generic [ref=e7]: at constructor (/app/node_modules/@babel/parser/lib/index.js:367:19) at TypeScriptParserMixin.raise (/app/node_modules/@babel/parser/lib/index.js:6624:19) at TypeScriptParserMixin.jsxReadToken (/app/node_modules/@babel/parser/lib/index.js:4477:20) at TypeScriptParserMixin.getTokenFromCode (/app/node_modules/@babel/parser/lib/index.js:4803:12) at TypeScriptParserMixin.getTokenFromCode (/app/node_modules/@babel/parser/lib/index.js:10042:11) at TypeScriptParserMixin.nextToken (/app/node_modules/@babel/parser/lib/index.js:5807:10) at TypeScriptParserMixin.next (/app/node_modules/@babel/parser/lib/index.js:5717:10) at TypeScriptParserMixin.eat (/app/node_modules/@babel/parser/lib/index.js:5721:12) at TypeScriptParserMixin.expect (/app/node_modules/@babel/parser/lib/index.js:6923:15) at TypeScriptParserMixin.jsxParseClosingElementAt (/app/node_modules/@babel/parser/lib/index.js:4709:10) at TypeScriptParserMixin.jsxParseElementAt (/app/node_modules/@babel/parser/lib/index.js:4724:37) at TypeScriptParserMixin.jsxParseElementAt (/app/node_modules/@babel/parser/lib/index.js:4727:32) at TypeScriptParserMixin.jsxParseElementAt (/app/node_modules/@babel/parser/lib/index.js:4727:32) at TypeScriptParserMixin.jsxParseElement (/app/node_modules/@babel/parser/lib/index.js:4778:17) at TypeScriptParserMixin.parseExprAtom (/app/node_modules/@babel/parser/lib/index.js:4788:19) at TypeScriptParserMixin.parseExprSubscripts (/app/node_modules/@babel/parser/lib/index.js:11145:23) at TypeScriptParserMixin.parseUpdate (/app/node_modules/@babel/parser/lib/index.js:11130:21) at TypeScriptParserMixin.parseMaybeUnary (/app/node_modules/@babel/parser/lib/index.js:11110:23) at TypeScriptParserMixin.parseMaybeUnary (/app/node_modules/@babel/parser/lib/index.js:9890:18) at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (/app/node_modules/@babel/parser/lib/index.js:10963:61) at TypeScriptParserMixin.parseExprOps (/app/node_modules/@babel/parser/lib/index.js:10968:23) at TypeScriptParserMixin.parseMaybeConditional (/app/node_modules/@babel/parser/lib/index.js:10945:23) at TypeScriptParserMixin.parseMaybeAssign (/app/node_modules/@babel/parser/lib/index.js:10895:21) at /app/node_modules/@babel/parser/lib/index.js:9828:39 at TypeScriptParserMixin.tryParse (/app/node_modules/@babel/parser/lib/index.js:6932:20) at TypeScriptParserMixin.parseMaybeAssign (/app/node_modules/@babel/parser/lib/index.js:9828:18) at /app/node_modules/@babel/parser/lib/index.js:10864:39 at TypeScriptParserMixin.allowInAnd (/app/node_modules/@babel/parser/lib/index.js:12500:12) at TypeScriptParserMixin.parseMaybeAssignAllowIn (/app/node_modules/@babel/parser/lib/index.js:10864:17) at TypeScriptParserMixin.parseMaybeAssignAllowInOrVoidPattern (/app/node_modules/@babel/parser/lib/index.js:12567:17) at TypeScriptParserMixin.parseParenAndDistinguishExpression (/app/node_modules/@babel/parser/lib/index.js:11747:28) at TypeScriptParserMixin.parseExprAtom (/app/node_modules/@babel/parser/lib/index.js:11395:23) at TypeScriptParserMixin.parseExprAtom (/app/node_modules/@babel/parser/lib/index.js:4793:20) at TypeScriptParserMixin.parseExprSubscripts (/app/node_modules/@babel/parser/lib/index.js:11145:23) at TypeScriptParserMixin.parseUpdate (/app/node_modules/@babel/parser/lib/index.js:11130:21) at TypeScriptParserMixin.parseMaybeUnary (/app/node_modules/@babel/parser/lib/index.js:11110:23) at TypeScriptParserMixin.parseMaybeUnary (/app/node_modules/@babel/parser/lib/index.js:9890:18) at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (/app/node_modules/@babel/parser/lib/index.js:10963:61) at TypeScriptParserMixin.parseExprOps (/app/node_modules/@babel/parser/lib/index.js:10968:23) at TypeScriptParserMixin.parseMaybeConditional (/app/node_modules/@babel/parser/lib/index.js:10945:23) at TypeScriptParserMixin.parseMaybeAssign (/app/node_modules/@babel/parser/lib/index.js:10895:21) at TypeScriptParserMixin.parseMaybeAssign (/app/node_modules/@babel/parser/lib/index.js:9839:20) at TypeScriptParserMixin.parseExpressionBase (/app/node_modules/@babel/parser/lib/index.js:10848:23) at /app/node_modules/@babel/parser/lib/index.js:10844:39 at TypeScriptParserMixin.allowInAnd (/app/node_modules/@babel/parser/lib/index.js:12495:16) at TypeScriptParserMixin.parseExpression (/app/node_modules/@babel/parser/lib/index.js:10844:17) at TypeScriptParserMixin.parseReturnStatement (/app/node_modules/@babel/parser/lib/index.js:13218:28) at TypeScriptParserMixin.parseStatementContent (/app/node_modules/@babel/parser/lib/index.js:12874:21) at TypeScriptParserMixin.parseStatementContent (/app/node_modules/@babel/parser/lib/index.js:9569:18) at TypeScriptParserMixin.parseStatementLike (/app/node_modules/@babel/parser/lib/index.js:12843:17
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.ts
    - text: .
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('verify merchant dashboard security and snippet', async ({ page }) => {
  4  |   await page.goto('http://localhost:3000/#dashboard');
  5  |
  6  |   // Enter public key
  7  |   const keyInput = page.locator('input[placeholder="Enter API Key"]');
> 8  |   await keyInput.fill('public-preview-2025');
     |                  ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  9  |
  10 |   // Click sync
  11 |   await page.click('button:has-text("Sync")');
  12 |
  13 |   // Verify stats appear (at least the headers)
  14 |   await expect(page.locator('text=Total Sessions')).toBeVisible();
  15 |
  16 |   // Verify snippet appears
  17 |   await expect(page.locator('text=Quick Integration Snippet')).toBeVisible();
  18 |
  19 |   // Verify the snippet contains the key
  20 |   const snippet = page.locator('pre');
  21 |   await expect(snippet).toContainText('public-preview-2025');
  22 |
  23 |   // Verify it contains the version
  24 |   await expect(snippet).toContainText('1.1.2');
  25 |
  26 |   await page.screenshot({ path: 'merchant_dashboard_verified.png', fullPage: true });
  27 | });
  28 |
```