const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const MEMORY_PATH = path.resolve(__dirname, '../prompts/agent_memory.json');

function readMemory() {
  try {
    const raw = fs.readFileSync(MEMORY_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

function writeMemory(obj) {
  const tmp = MEMORY_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, MEMORY_PATH);
}

function _q(s) {
  return `"${String(s).replace(/"/g, '\\"')}"`;
}

function commitAfterWrite(summary) {
  // Read current memory and write a human-readable note, then try to commit locally.
  const mem = readMemory();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const noteDir = path.resolve(__dirname, '../prompts/agent_memory_commits');
  if (!fs.existsSync(noteDir)) fs.mkdirSync(noteDir, { recursive: true });
  const notePath = path.join(noteDir, `agent-memory-update-${ts}.md`);
  const snapshot = JSON.stringify(mem, null, 2);
  const finalNote = `# Agent Memory Update\n\nTimestamp: ${new Date().toISOString()}\n\nSummary:\n\n${summary || 'No summary provided.'}\n\nMemory snapshot:\n\n\n\n\n\n\n\\` + '```json\n' + snapshot + '\n```\n';
  fs.writeFileSync(notePath, finalNote, 'utf8');

  // Try to stage and commit the memory file and the note. Ignore failures (no git initialized etc.).
  try {
    child_process.execSync(`git add ${_q(MEMORY_PATH)} ${_q(notePath)}`, { stdio: 'ignore' });
    const commitMsg = `agent(memory): ${String(summary || 'update agent memory')}`.slice(0, 200);
    child_process.execSync(`git commit -m ${_q(commitMsg)}`, { stdio: 'ignore' });
  } catch (e) {
    // ignore commit errors
  }

  let commitHash = null;
  try {
    commitHash = child_process.execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    // ignore
  }

  return { notePath, commitHash };
}

function get(keyPath) {
  const mem = readMemory();
  if (!keyPath) return mem;
  const parts = keyPath.split('.');
  let cur = mem;
  for (const p of parts) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function set(keyPath, value) {
  const mem = readMemory();
  const parts = keyPath.split('.');
  let cur = mem;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p]) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
  writeMemory(mem);
}

function appendTask(task) {
  const mem = readMemory();
  mem.openTasks = mem.openTasks || [];
  mem.openTasks.push(task);
  writeMemory(mem);
}

module.exports = { readMemory, writeMemory, get, set, appendTask, MEMORY_PATH, commitAfterWrite };
