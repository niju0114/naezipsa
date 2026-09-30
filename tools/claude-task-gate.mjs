import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Only the explicitly selected task and owner commands may invoke paid execution.
export function selectTask(event, context) {
  if (context.eventName !== 'issue_comment' || event?.action !== 'created') {
    throw new Error('Only newly created issue comments are supported.');
  }
  if (context.repository !== 'niju0114/naezipsa' ||
      event?.repository?.full_name !== 'niju0114/naezipsa') {
    throw new Error('Unexpected repository.');
  }
  if (context.actor !== 'niju0114' || context.triggeringActor !== 'niju0114' ||
      event?.sender?.login !== 'niju0114' || event?.sender?.type !== 'User' ||
      event?.comment?.user?.login !== 'niju0114' || event?.comment?.user?.type !== 'User') {
    throw new Error('Only the repository owner can start this pilot.');
  }
  if (event?.issue?.number !== 51 || event.issue.state !== 'open' || event.issue.pull_request) {
    throw new Error('Only open issue #51 is enabled.');
  }
  const modes = new Map([
    ['@claude audit', 'audit'],
    ['@claude implement 1', 'implement-1'],
  ]);
  const mode = modes.get(event.comment.body);
  if (!mode) throw new Error('Use exactly @claude audit or @claude implement 1.');
  return { mode };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const { mode } = selectTask(event, {
    eventName: process.env.GITHUB_EVENT_NAME,
    repository: process.env.GITHUB_REPOSITORY,
    actor: process.env.GITHUB_ACTOR,
    triggeringActor: process.env.GITHUB_TRIGGERING_ACTOR,
  });
  appendFileSync(process.env.GITHUB_OUTPUT, `mode=${mode}\n`);
  console.log(`Selected issue #51 mode: ${mode}`);
}
