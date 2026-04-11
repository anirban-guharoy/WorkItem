#!/usr/bin/env node

import axios from 'axios';

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY = process.argv[2] || process.env.JIRA_PROJECT_KEY;
const ISSUE_TYPE = process.argv[3] || process.env.JIRA_ISSUE_TYPE || 'Task';
const SUMMARY = process.argv[4] || process.env.JIRA_ISSUE_SUMMARY;
const DESCRIPTION = process.argv[5] || process.env.JIRA_ISSUE_DESCRIPTION;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Error: JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN are required.');
  process.exit(1);
}

if (!PROJECT_KEY || !ISSUE_TYPE || !SUMMARY) {
  console.error('Error: project key, issue type, and summary are required.');
  console.error('Usage: node jira/create-issue.mjs <projectKey> <issueType> <summary> [description]');
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
    const payload = {
      fields: {
        project: { key: PROJECT_KEY },
        issuetype: { name: ISSUE_TYPE },
        summary: SUMMARY,
      },
    };

    if (DESCRIPTION) {
      payload.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: DESCRIPTION }],
          },
        ],
      };
    }

    const response = await client.post('/rest/api/3/issue', payload);
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();