#!/usr/bin/env node

import axios from 'axios';

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL;
const CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL;
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const PAGE_ID = process.argv[2] || process.env.CONFLUENCE_PAGE_ID;
const TITLE = process.argv[3] || process.env.CONFLUENCE_PAGE_TITLE;
const BODY = process.argv[4] || process.env.CONFLUENCE_PAGE_BODY;
const VERSION_NUMBER_INPUT = process.argv[5] || process.env.CONFLUENCE_VERSION_NUMBER;

if (!CONFLUENCE_BASE_URL || !CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN) {
  console.error('Error: CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN are required.');
  process.exit(1);
}

if (!PAGE_ID || !TITLE || !BODY) {
  console.error('Error: page id, title, and body are required.');
  console.error('Usage: node confluence/update-page.mjs <pageId> <title> <body> [versionNumber]');
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

async function getNextVersionNumber() {
  if (VERSION_NUMBER_INPUT) {
    const explicitVersionNumber = Number(VERSION_NUMBER_INPUT);
    if (!Number.isFinite(explicitVersionNumber) || explicitVersionNumber < 1) {
      throw new Error('versionNumber must be a positive number when provided.');
    }

    return explicitVersionNumber;
  }

  const response = await client.get(`/rest/api/content/${PAGE_ID}`, {
    params: {
      expand: 'version',
    },
  });

  const currentVersionNumber = response.data?.version?.number;
  if (typeof currentVersionNumber !== 'number') {
    throw new Error(`Could not determine current version for Confluence page ${PAGE_ID}.`);
  }

  return currentVersionNumber + 1;
}

async function main() {
  try {
    const versionNumber = await getNextVersionNumber();

    const response = await client.put(`/rest/api/content/${PAGE_ID}`, {
      id: PAGE_ID,
      type: 'page',
      title: TITLE,
      version: {
        number: versionNumber,
      },
      body: {
        storage: {
          value: BODY,
          representation: 'storage',
        },
      },
    }, {
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