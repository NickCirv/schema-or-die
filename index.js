#!/usr/bin/env node

'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const REQUIRED_FIELDS = {
  Organization: ['name', 'url'],
  LocalBusiness: ['name', 'address', 'telephone'],
  WebSite: ['name', 'url'],
  Article: ['headline', 'datePublished', 'author'],
  BlogPosting: ['headline', 'datePublished', 'author'],
  NewsArticle: ['headline', 'datePublished', 'author'],
  Product: ['name', 'description'],
  FAQPage: ['mainEntity'],
  HowTo: ['name', 'step'],
  BreadcrumbList: ['itemListElement'],
  Review: ['itemReviewed', 'author', 'reviewRating'],
  AggregateRating: ['ratingValue', 'reviewCount'],
  Event: ['name', 'startDate', 'location'],
  Recipe: ['name', 'recipeIngredient', 'recipeInstructions'],
  VideoObject: ['name', 'description', 'uploadDate'],
  Person: ['name'],
  JobPosting: ['title', 'hiringOrganization', 'jobLocation'],
  Course: ['name', 'description'],
  SoftwareApplication: ['name', 'operatingSystem'],
};

const SCHEMA_SCORES = {
  Organization: 15,
  LocalBusiness: 15,
  WebSite: 10,
  BreadcrumbList: 10,
  Article: 10,
  BlogPosting: 10,
  NewsArticle: 10,
  Product: 15,
  FAQPage: 10,
  HowTo: 10,
  Review: 10,
  AggregateRating: 10,
  Event: 8,
  Recipe: 8,
  VideoObject: 8,
  Person: 5,
  JobPosting: 8,
  Course: 8,
  SoftwareApplication: 8,
};

const COMMON_TYPES = Object.keys(SCHEMA_SCORES);

function fetch(targetUrl, redirectCount) {
  redirectCount = redirectCount || 0;
  return new Promise(function(resolve, reject) {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));

    const parsed = new URL(targetUrl);
    const mod = parsed.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname || '/',
      port: parsed.port,
      headers: {
        'User-Agent': 'schema-or-die/1.0 (+https://github.com/NickCirv/schema-or-die)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    };

    const req = mod.get(options, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (!loc.startsWith('http')) {
          loc = parsed.protocol + '//' + parsed.hostname + loc;
        }
        return resolve(fetch(loc, redirectCount + 1));
      }

      if (res.statusCode >= 400) {
        return reject(new Error('HTTP ' + res.statusCode + ': ' + res.statusMessage));
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        body += chunk;
        if (body.length > 5 * 1024 * 1024) req.destroy();
      });
      res.on('end', function() { resolve(body); });
    });

    req.on('timeout', function() {
      req.destroy();
      reject(new Error('Request timed out after 15s'));
    });

    req.on('error', reject);
  });
}

function extractJsonLd(html) {
  const schemas = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        parsed.forEach(function(item) { schemas.push(item); });
      } else if (parsed['@graph']) {
        parsed['@graph'].forEach(function(item) { schemas.push(item); });
      } else {
        schemas.push(parsed);
      }
    } catch (_) {}
  }
  return schemas;
}

function extractMicrodata(html) {
  const schemas = [];
  const re = /<[^>]+itemscope[^>]*itemtype=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const typeName = match[1]
      .replace('https://schema.org/', '')
      .replace('http://schema.org/', '');
    schemas.push({ '@type': typeName, _source: 'microdata' });
  }
  return schemas;
}

function getType(schema) {
  const t = schema['@type'];
  if (!t) return null;
  return Array.isArray(t) ? t[0] : t;
}

function validateSchema(schema) {
  const type = getType(schema);
  if (!type) return { valid: false, errors: ['Missing @type'] };
  const required = REQUIRED_FIELDS[type] || [];
  const missing = required.filter(function(field) {
    const val = schema[field];
    return val === undefined || val === null || val === '';
  });
  return { valid: missing.length === 0, errors: missing.map(function(f) { return 'missing: ' + f; }) };
}

function hasSearchAction(schema) {
  if (getType(schema) !== 'WebSite') return false;
  return !!(schema.potentialAction && schema.potentialAction['@type'] === 'SearchAction');
}

function scoreSchemas(schemas) {
  let score = 0;
  const breakdown = [];
  const foundTypes = {};

  if (schemas.length === 0) return { score: 0, breakdown: [] };

  score += 20;
  breakdown.push({ label: 'Has schema markup', points: 20 });

  schemas.forEach(function(schema) {
    const type = getType(schema);
    if (!type || foundTypes[type]) return;
    foundTypes[type] = true;

    const weight = SCHEMA_SCORES[type] || 0;
    if (weight === 0) return;

    const validation = validateSchema(schema);
    const deduction = validation.errors.length * 10;
    const net = Math.max(weight - deduction, 0);

    if (net > 0) {
      score += net;
      breakdown.push({ label: type, points: net, capped: deduction > 0 });
    } else {
      breakdown.push({ label: type, points: 0, capped: true });
    }

    if (type === 'WebSite' && hasSearchAction(schema)) {
      score += 5;
      breakdown.push({ label: 'WebSite has SearchAction', points: 5 });
    }
  });

  return { score: Math.min(score, 100), breakdown: breakdown };
}

function getMissingTypes(schemas) {
  const found = {};
  schemas.forEach(function(s) {
    const t = getType(s);
    if (t) found[t] = true;
  });
  return ['Organization', 'LocalBusiness', 'WebSite', 'BreadcrumbList', 'FAQPage', 'Product']
    .filter(function(t) { return !found[t]; });
}

function getVerdict(score) {
  if (score <= 20) return c.red + c.bold + '"Your site is invisible to machines. RIP."' + c.reset;
  if (score <= 40) return c.red + c.bold + '"Schema exists but it\'s on life support."' + c.reset;
  if (score <= 60) return c.yellow + c.bold + '"Mediocre. Google squints at your site."' + c.reset;
  if (score <= 80) return c.cyan + c.bold + '"Solid. Rich snippets are possible."' + c.reset;
  return c.green + c.bold + '"Chef\'s kiss. Schema perfection."' + c.reset;
}

function scoreBar(score) {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  const bar = c.green + '\u2588'.repeat(filled) + c.reset + c.gray + '\u2591'.repeat(empty) + c.reset;
  let scoreColor = c.red;
  if (score > 80) scoreColor = c.green;
  else if (score > 60) scoreColor = c.cyan;
  else if (score > 40) scoreColor = c.yellow;
  return bar + ' ' + scoreColor + c.bold + score + '/100' + c.reset;
}

function extractGoogleView(schemas) {
  const view = [];
  const seen = {};
  schemas.forEach(function(schema) {
    if (view.length >= 6) return;
    const type = getType(schema);
    if (!type || seen[type]) return;
    seen[type] = true;
    if (schema.name) view.push({ key: 'Name', value: String(schema.name) });
    if (schema['@type']) view.push({ key: 'Type', value: Array.isArray(schema['@type']) ? schema['@type'].join(', ') : schema['@type'] });
    if (schema.url) view.push({ key: 'URL', value: String(schema.url) });
    if (schema.description) {
      const d = String(schema.description);
      view.push({ key: 'Description', value: d.length > 100 ? d.slice(0, 100) + '...' : d });
    }
  });
  return view;
}

function print(line) {
  process.stdout.write((line || '') + '\n');
}

function run() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    print(c.bold + c.cyan + 'schema-or-die' + c.reset + ' \u2014 Schema.org validator');
    print('');
    print('  Usage: ' + c.bold + 'schema-or-die <url>' + c.reset);
    print('  Example: ' + c.dim + 'npx schema-or-die https://example.com' + c.reset);
    print('');
    process.exit(0);
  }

  let targetUrl = args[0];
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

  print('');
  print(c.bold + c.white + 'SCHEMA OR DIE' + c.reset + c.gray + ' \u2014 Schema.org Validator' + c.reset);
  print(c.gray + '\u2501'.repeat(42) + c.reset);
  print('');
  print(c.dim + 'Fetching ' + targetUrl + '...' + c.reset);

  fetch(targetUrl).then(function(html) {
    const jsonLdSchemas = extractJsonLd(html);
    const microdataSchemas = extractMicrodata(html);
    const allSchemas = jsonLdSchemas.concat(microdataSchemas);

    const result = scoreSchemas(allSchemas);
    const score = result.score;
    const breakdown = result.breakdown;
    const missing = getMissingTypes(allSchemas);
    const googleView = extractGoogleView(allSchemas);

    print('');
    print(c.dim + 'URL: ' + c.reset + c.white + targetUrl + c.reset);
    print('');
    print(c.bold + 'Score: ' + c.reset + scoreBar(score));
    print('');

    if (allSchemas.length === 0) {
      print(c.red + c.bold + 'No schema markup found.' + c.reset);
    } else {
      print(c.bold + 'Found schemas:' + c.reset);
      const seen = {};
      allSchemas.forEach(function(schema) {
        const type = getType(schema);
        if (!type || seen[type]) return;
        seen[type] = true;
        const validation = validateSchema(schema);
        const source = schema._source === 'microdata' ? ' ' + c.dim + '[microdata]' + c.reset : '';
        if (validation.valid) {
          print('  ' + c.green + '\u2705' + c.reset + ' ' + c.white + type + c.reset + source + ' ' + c.gray + '(valid)' + c.reset);
        } else {
          print('  ' + c.yellow + '\u26a0\ufe0f ' + c.reset + ' ' + c.white + type + c.reset + source + ' ' + c.yellow + '(' + validation.errors.join(', ') + ')' + c.reset);
        }
      });
    }

    print('');

    if (missing.length > 0) {
      print(c.bold + 'Missing (recommended):' + c.reset);
      missing.forEach(function(type) {
        print('  ' + c.red + '\u274c' + c.reset + ' ' + c.gray + type + c.reset);
      });
      print('');
    }

    if (googleView.length > 0) {
      print(c.bold + 'What Google sees:' + c.reset);
      googleView.forEach(function(item) {
        print('  ' + c.cyan + item.key + ':' + c.reset + ' ' + c.white + '"' + item.value + '"' + c.reset);
      });
      print('');
    }

    const knownSet = {};
    COMMON_TYPES.forEach(function(t) { knownSet[t] = true; });
    const unknownTypes = [];
    const seenUnknown = {};
    allSchemas.forEach(function(s) {
      const t = getType(s);
      if (t && !knownSet[t] && !seenUnknown[t]) {
        unknownTypes.push(t);
        seenUnknown[t] = true;
      }
    });
    if (unknownTypes.length > 0) {
      print(c.bold + 'Custom/Other types:' + c.reset);
      unknownTypes.forEach(function(t) {
        print('  ' + c.magenta + '\u25c6' + c.reset + ' ' + c.gray + t + c.reset);
      });
      print('');
    }

    if (breakdown.length > 0) {
      print(c.bold + 'Score breakdown:' + c.reset);
      breakdown.forEach(function(item) {
        const pts = item.points > 0 ? c.green + '+' + item.points + c.reset : c.gray + '+0' + c.reset;
        const note = item.capped ? ' ' + c.yellow + '(errors reduced score)' + c.reset : '';
        print('  ' + pts + ' ' + c.dim + item.label + c.reset + note);
      });
      print('');
    }

    print(c.bold + 'Verdict: ' + c.reset + getVerdict(score));
    print('');
    print(c.gray + '\u2501'.repeat(42) + c.reset);
    print(c.dim + 'Built by the creators of Cirv Box \u2014 Schema.org made easy for WordPress' + c.reset);
    print(c.dim + 'https://github.com/NickCirv' + c.reset);
    print('');

  }).catch(function(err) {
    print('');
    print(c.red + c.bold + 'Error: ' + c.reset + err.message);
    print('');
    process.exit(1);
  });
}

run();
