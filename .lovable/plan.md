# GitHub sync verification change

A one-line, harmless edit so a commit appears in the new repo and you can confirm two-way sync is live.

## Prerequisite (you)

Connect the repo first: chat input Plus (+) → GitHub → Connect project → authorize → pick account/org → Create Repository. I can't run that flow; it needs your GitHub authorization.

## What I'll change

Update `README.md`: replace the generic project blurb with a short, accurate description of this app (a claims-initiation assistant demo with an escalation inbox and decision log). That doubles as a real improvement, not throwaway filler.

No source, config, backend, or route files are touched.

## How you verify

1. Open the new repo on GitHub.
2. Check the commit list — a fresh commit touching `README.md` should appear within a few seconds of my edit.
3. Optional reverse check: edit a line in the repo directly on GitHub, commit, and the change shows up here.

## Notes

- Sync is two-way and automatic once connected; no manual push or pull.
- Lovable creates a new repo — importing an existing repo isn't supported.
