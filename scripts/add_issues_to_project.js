#!/usr/bin/env node
// Usage: GH_TOKEN=<token> node scripts/add_issues_to_project.js --project-id=<PROJECT_ID> --issues-file=path/to/created-issues.json
// created-issues.json should be an array of issue URLs (e.g. ["https://github.com/owner/repo/issues/123", ...])

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function graphql(query, variables = {}) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GH_TOKEN or GITHUB_TOKEN required in env');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach(a => {
    const [k, v] = a.split('=');
    out[k.replace(/^--/, '')] = v || true;
  });
  return out;
}

async function getProjectItems(projectId) {
  const query = `query ($id: ID!) { node(id: $id) { ... on ProjectV2 { items(first:100) { nodes { id content { ... on Issue { id url } } } } } }`;
  const data = await graphql(query, { id: projectId });
  return data.node.items.nodes;
}

async function getIssueNodeId(owner, repo, number) {
  const query = `query ($owner:String!, $repo:String!, $number:Int!) { repository(owner:$owner, name:$repo) { issue(number:$number) { id } } }`;
  const data = await graphql(query, { owner, repo, number: Number(number) });
  return data.repository.issue.id;
}

async function addItemToProject(projectId, contentId) {
  const mutation = `mutation($projectId:ID!, $contentId:ID!) { addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) { item { id } } }`;
  const data = await graphql(mutation, { projectId, contentId });
  return data.addProjectV2ItemById.item.id;
}

async function main() {
  const args = parseArgs();
  const projectId = args['project-id'];
  const issuesFile = args['issues-file'];
  if (!projectId || !issuesFile) {
    console.error('Usage: node scripts/add_issues_to_project.js --project-id=<PROJECT_NODE_ID> --issues-file=path/to/created-issues.json');
    process.exit(2);
  }

  const issues = JSON.parse(fs.readFileSync(path.resolve(issuesFile), 'utf8'));
  for (const url of issues) {
    // parse url like https://github.com/owner/repo/issues/123
    const m = url.match(/github.com\/(.+?)\/(.+?)\/issues\/(\d+)/);
    if (!m) {
      console.warn('Skipping invalid URL:', url);
      continue;
    }
    const owner = m[1];
    const repo = m[2];
    const number = m[3];
    console.log(`Resolving issue ${owner}/${repo}#${number}`);
    const issueNodeId = await getIssueNodeId(owner, repo, number);
    console.log('Issue node id:', issueNodeId);
    console.log('Adding to project...');
    const addedItemId = await addItemToProject(projectId, issueNodeId);
    console.log('Added item id:', addedItemId);
  }
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
