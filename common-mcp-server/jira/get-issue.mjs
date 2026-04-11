#!/usr/bin/env node

import axios from 'axios';

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const ISSUE_KEY = process.argv[2] || process.env.JIRA_ISSUE_KEY;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Error: JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN are required.');
  process.exit(1);
}

if (!ISSUE_KEY) {
  console.error('Error: Jira issue key is required. Pass it as the first argument or set JIRA_ISSUE_KEY.');
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
    const response = await client.get(`/rest/api/3/issue/${ISSUE_KEY}`, {
      params: {
        fields: 'summary,description,status,assignee,reporter,created,updated',
      },
    });

    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();