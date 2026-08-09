# Smart Claims Initiation Assistant

A prototype conversational agent for health insurance claim initiation. It determines eligibility across a member's policies, explains what's covered and what isn't, and hands off to a human specialist rather than guessing when the answer is ambiguous.

## What's in the app

- **Claims assistant** (`/`) — member selector, one-click scenario presets, streaming chat, and a live trace panel showing every tool call the agent makes with its arguments and returned payload.
- **Escalation inbox** (`/inbox`) — durable handoff records with reference number, trigger reason, a summary count and reason breakdown, and Open / In Review / Resolved status on each card.
- **Decision log** (`/decision-log`) — the architectural decisions, escalation triggers, and known limitations behind the build.

## Agent tools

`get_customer_policies`, `check_eligibility`, `get_document_requirements`, `get_claim_timing_rule`, and `escalate_to_human`. Escalation is preferred over speculation: conflicting policies, unknown treatments, and unresolved rider status all trigger a human handoff.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Lovable Cloud (database, auth) and Lovable AI

## Working in Lovable

Open the project in the [Lovable editor](https://lovable.dev) and keep building. With GitHub connected, every change made in Lovable commits straight to this repository, and pushes here sync back into Lovable.
