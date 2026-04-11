#!/usr/bin/env node

import axios from 'axios';

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL;
const CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL;
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const PAGE_ID = process.argv[2] || process.env.CONFLUENCE_PAGE_ID;

if (!CONFLUENCE_BASE_URL || !CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN) {
  console.error('Error: CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN are required.');
  process.exit(1);
}

if (!PAGE_ID) {
  console.error('Error: Confluence page id is required. Pass it as the first argument or set CONFLUENCE_PAGE_ID.');
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

async function main() {
  try {
    const response = await client.get(`/rest/api/content/${PAGE_ID}`, {
      params: {
        expand: 'body.storage,space,version,ancestors',
      },
    });

    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();