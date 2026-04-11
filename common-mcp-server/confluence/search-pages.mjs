#!/usr/bin/env node

import axios from 'axios';

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL;
const CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL;
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const QUERY = process.argv[2] || process.env.CONFLUENCE_QUERY;
const LIMIT = Number(process.argv[3] || process.env.CONFLUENCE_LIMIT || '10');
const SPACE_KEY = process.argv[4] || process.env.CONFLUENCE_SPACE_KEY;

if (!CONFLUENCE_BASE_URL || !CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN) {
  console.error('Error: CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN are required.');
  process.exit(1);
}

if (!QUERY) {
  console.error('Error: search query is required. Pass it as the first argument or set CONFLUENCE_QUERY.');
  process.exit(1);
}

const wikiBaseUrl = CONFLUENCE_BASE_URL.replace(/\/$/, '').endsWith('/wiki')
  ? CONFLUENCE_BASE_URL.replace(/\/$/, '')
  : `${CONFLUENCE_BASE_URL.replace(/\/$/, '')}/wiki`;

const client = axios.create({
  baseURL: wikiBaseUrl,
  auth: {
    username: CONFLUENCE_EMAIL,
    password: CONFLUENCE_API_TOKEN,
  },
  headers: {
    Accept: 'application/json',
  },
});

function escapeCqlString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function main() {
  try {
    const cqlParts = ['type = page', `text ~ "${escapeCqlString(QUERY)}"`];
    if (SPACE_KEY) {
      cqlParts.push(`space = "${escapeCqlString(SPACE_KEY)}"`);
    }

    const response = await client.get('/rest/api/content/search', {
      params: {
        cql: cqlParts.join(' AND '),
        limit: LIMIT,
        expand: 'space,version',
      },
    });

    for (const page of response.data.results || []) {
      console.log(`${page.id} | ${page.title} | ${page.space?.key || 'Unknown space'}`);
    }

    console.log(`\nTotal pages returned: ${(response.data.results || []).length}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();