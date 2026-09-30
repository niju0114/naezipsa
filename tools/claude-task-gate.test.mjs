import test from 'node:test';
import assert from 'node:assert/strict';
import { selectTask } from './claude-task-gate.mjs';

function fixture() {
  return {
    event: {
      action: 'created', repository: { full_name: 'niju0114/naezipsa' },
      sender: { login: 'niju0114', type: 'User' },
      comment: { body: '@claude audit', user: { login: 'niju0114', type: 'User' } },
      issue: { number: 51, state: 'open' },
    },
    context: { eventName: 'issue_comment', repository: 'niju0114/naezipsa', actor: 'niju0114', triggeringActor: 'niju0114' },
  };
}

test('owner can select audit and implementation stage 1', () => {
  const { event, context } = fixture();
  assert.equal(selectTask(event, context).mode, 'audit');
  event.comment.body = '@claude implement 1';
  assert.equal(selectTask(event, context).mode, 'implement-1');
});

const rejected = [
  ['external commenter', f => { f.event.comment.user.login = 'outsider'; }],
  ['external sender', f => { f.event.sender.login = 'outsider'; }],
  ['bot recursion', f => { f.event.comment.user.type = 'Bot'; }],
  ['rerun by someone else', f => { f.context.triggeringActor = 'outsider'; }],
  ['Jinsu task', f => { f.event.issue.number = 47; }],
  ['closed task', f => { f.event.issue.state = 'closed'; }],
  ['pull request comment', f => { f.event.issue.pull_request = { url: 'example' }; }],
  ['edited comment', f => { f.event.action = 'edited'; }],
  ['scheduled event', f => { f.context.eventName = 'schedule'; }],
  ['different repository', f => { f.event.repository.full_name = 'other/repo'; }],
  ['command with shell payload', f => { f.event.comment.body = '@claude audit; echo leak'; }],
  ['unapproved stage', f => { f.event.comment.body = '@claude implement 2'; }],
];
for (const [name, change] of rejected) {
  test(`reject ${name}`, () => {
    const f = fixture(); change(f);
    assert.throws(() => selectTask(f.event, f.context));
  });
}
