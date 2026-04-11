#!/usr/bin/env node

import axios from 'axios';

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL;
const CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL;
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const SPACE_KEY = process.argv[2] || process.env.CONFLUENCE_SPACE_KEY;
const TITLE = process.argv[3] || process.env.CONFLUENCE_PAGE_TITLE;
const BODY = process.argv[4] || process.env.CONFLUENCE_PAGE_BODY;
const PARENT_PAGE_ID = process.argv[5] || process.env.CONFLUENCE_PARENT_PAGE_ID;

if (!CONFLUENCE_BASE_URL || !CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN) {
  console.error('Error: CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN are required.');
  process.exit(1);
}

if (!SPACE_KEY || !TITLE || !BODY) {
  console.error('Error: space key, title, and body are required.');
  console.error('Usage: node confluence/create-page.mjs <spaceKey> <title> <body> [parentPageId]');
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
    const payload = {
      type: 'page',
      title: TITLE,
      space: { key: SPACE_KEY },
      body: {
        storage: {
          value: BODY,
          representation: 'storage',
        },
      },
    };

    if (PARENT_PAGE_ID) {
      payload.ancestors = [{ id: PARENT_PAGE_ID }];
    }

    const response = await client.post('/rest/api/content', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();