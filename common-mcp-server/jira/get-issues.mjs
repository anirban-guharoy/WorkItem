#!/usr/bin/env node

import axios from 'axios';

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY = process.argv[2] || process.env.JIRA_PROJECT_KEY;
const MAX_RESULTS = Number(process.argv[3] || process.env.JIRA_MAX_RESULTS || '20');

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Error: JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN are required.');
  process.exit(1);
}

if (!PROJECT_KEY) {
  console.error('Error: Jira project key is required. Pass it as the first argument or set JIRA_PROJECT_KEY.');
  process.exit(1);
}

const client = axios.create({
  baseURL: JIRA_BASE_URL.replace(/\/$/, ''),
  auth: {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
  },
  headers: {
    Accept: 'application/json',
  },
});

async function main() {
  try {
    console.log(`Fetching up to ${MAX_RESULTS} issues from project ${PROJECT_KEY}...\n`);

    const response = await client.post('/rest/api/3/search/jql', {
      jql: `project = ${PROJECT_KEY} AND type != Epic ORDER BY updated DESC`,
      fields: ['summary', 'status', 'assignee', 'updated'],
      maxResults: MAX_RESULTS,
    });

    for (const issue of response.data.issues || []) {
      console.log(`${issue.key} | ${issue.fields?.status?.name || 'Unknown'} | ${issue.fields?.summary || 'No summary'}`);
    }

    console.log(`\nTotal issues returned: ${(response.data.issues || []).length}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();