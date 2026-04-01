![Banner](banner.svg)

# schema-or-die

[![npm version](https://img.shields.io/npm/v/schema-or-die.svg)](https://www.npmjs.com/package/schema-or-die)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14-brightgreen.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)](https://www.npmjs.com/package/schema-or-die)

```
 ░██████╗░█████╗░██╗░░██╗███████╗███╗░░░███╗░█████╗░
 ██╔════╝██╔══██╗██║░░██║██╔════╝████╗░████║██╔══██╗
 ╚█████╗░██║░░╚═╝███████║█████╗░░██╔████╔██║███████║
 ░╚═══██╗██║░░██╗██╔══██║██╔══╝░░██║╚██╔╝██║██╔══██║
 ██████╔╝╚█████╔╝██║░░██║███████╗██║░╚═╝░██║██║░░██║
 ╚═════╝░░╚════╝░╚═╝░░╚═╝╚══════╝╚═╝░░░░╚═╝╚═╝░░╚═╝
  ░█████╗░██████╗░  ██████╗░██╗███████╗☠
  ██╔══██╗██╔══██╗  ██╔══██╗██║██╔════╝
  ██║░░██║██████╔╝  ██║░░██║██║█████╗░░
  ██║░░██║██╔══██╗  ██║░░██║██║██╔══╝░░
  ╚█████╔╝██║░░██║  ██████╔╝██║███████╗
  ░╚════╝░╚═╝░░╚═╝  ╚═════╝░╚═╝╚══════╝
```

**Zero-dependency CLI that validates your Schema.org markup and scores it 0-100.**

Your competitors are getting rich snippets. You're not. This tool tells you why.

---

## Usage

```bash
npx schema-or-die https://example.com
```

Or install globally:

```bash
npm install -g schema-or-die
schema-or-die https://example.com
```

---

## Example Output

```
SCHEMA OR DIE — Schema.org Validator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

URL: https://example.com

Score: ██████████░░░░░░░░░░ 45/100

Found schemas:
  ✅ Organization (valid)
  ✅ WebSite (valid)
  ⚠️  Article (missing: datePublished, missing: author)

Missing (recommended):
  ❌ BreadcrumbList
  ❌ FAQPage
  ❌ Product

What Google sees:
  Name: "Example Corp"
  Type: "Organization"
  URL: "https://example.com"

Score breakdown:
  +20 Has schema markup
  +15 Organization
  +10 WebSite
  +0  Article (errors reduced score)

Verdict: "Mediocre. Google squints at your site."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Built by the creators of Cirv Box — Schema.org made easy for WordPress
https://github.com/NickCirv
```

---

## Score Table

| Score | Verdict |
|-------|---------|
| 0–20  | "Your site is invisible to machines. RIP." |
| 21–40 | "Schema exists but it's on life support." |
| 41–60 | "Mediocre. Google squints at your site." |
| 61–80 | "Solid. Rich snippets are possible." |
| 81–100| "Chef's kiss. Schema perfection." |

---

## Score Breakdown

| Schema Type | Points |
|-------------|--------|
| Has ANY schema | +20 base |
| Organization / LocalBusiness | +15 |
| WebSite with SearchAction | +10 (+5 bonus) |
| BreadcrumbList | +10 |
| Article / BlogPosting | +10 |
| Product | +15 |
| FAQPage / HowTo | +10 |
| Review / AggregateRating | +10 |
| Missing required field | -10 per field |

---

## What It Validates

- **JSON-LD** (`<script type="application/ld+json">`)
- **Microdata** (`itemscope`, `itemtype`)
- **@graph** arrays and nested schemas
- Required fields per type (datePublished, author, etc.)
- SearchAction on WebSite

---

## Zero Dependencies

Uses only Node.js built-ins: `https`, `http`, `url`. No npm install required beyond the tool itself.

Works with Node.js 14+.

---

## You might also like

**[Cirv Box](https://wordpress.org/plugins/cirv-box/)** — Schema.org made easy for WordPress. Add rich structured data to your site without touching code.

Built by [github.com/NickCirv](https://github.com/NickCirv) ☠

---

## License

MIT

## Contributing

PRs welcome! If you have a funny idea or improvement:

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-idea`)
3. Commit your changes
4. Push to the branch (`git push origin feature/amazing-idea`)
5. Open a Pull Request

Found a bug? [Open an issue](https://github.com/NickCirv/schema-or-die/issues).

---

If this made you mass-exhale through your nose, mass-hit that star button.
