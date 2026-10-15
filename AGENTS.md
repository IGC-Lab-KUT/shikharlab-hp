# Repository instructions for Codex

These instructions apply to the entire repository. Preserve the laboratory website's existing design, bilingual structure, content, and GitHub Pages compatibility.

## Routine news updates

A routine news update is limited to:

- adding or correcting records in `data/news.json`;
- adding approved event photographs under `data/imgs/` with names beginning `news-`;
- correcting only the announcement requested by the user.

For a routine news request, Codex must:

1. Read `NEWS_GUIDELINES.md` and follow the existing schema in `data/news.json`.
2. Check existing records for the same event before adding anything.
3. Ask for genuinely missing facts, including the exact date, verified names, presenter or recipient, official links, captions, and photograph-consent status. Never invent academic information or translations of names.
4. Prepare accurate English and Japanese content with the same meaning. Retain official paper, conference, institution, and personal names unless the user supplies an official translation.
5. Use only photographs supplied or explicitly approved for website publication. Record factual bilingual alt text and captions. Do not use stock or AI-generated event photographs. If consent is unclear, keep the image out of the proposed update and ask the user.
6. Keep drafts as `"status": "draft"` until the user has reviewed the content. Show an English and Japanese preview and request confirmation before committing or pushing.
7. Run `node scripts/validate.mjs` and the available browser smoke test. Resolve validation failures without changing unrelated files.
8. Use a branch named `news/<short-event-name>` and create a pull request when the account permits it. This name is a convention, not a security boundary. Do not push a routine update directly to `main`.

Routine updates must not modify HTML, CSS, JavaScript, navigation, publications, members, the PI profile, research content, GitHub workflows, validation scripts, or other announcements.

## Corrections and privacy

- Change an existing item instead of creating a duplicate when correcting an announcement.
- Preserve its `id` so existing links remain valid, and update `lastUpdated` using `YYYY-MM-DD`.
- If someone asks not to appear, remove the photograph or use a user-approved blurred replacement. Never create a blurred version without confirming which faces must be obscured.
- Do not publish contact details, private schedules, unpublished results, student records, or other sensitive information unless the repository owner explicitly approves them.

## Structural changes

Anything outside the routine scope above is a structural website change. This includes schema changes, new categories that are not documented, rendering changes, design changes, automation changes, or edits to non-news content.

For structural changes, stop, explain the proposed files and effect, and obtain the repository owner's approval before editing. Use a separate feature branch and pull request. The branch-independent scope check classifies the pull request, and `.github/CODEOWNERS` requires professor review for files outside the routine news paths. `AGENTS.md` is guidance for Codex; GitHub permissions and protected-branch rules provide actual enforcement.

