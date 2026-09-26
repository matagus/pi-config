---
description: Add Django article URLs to awesome-django-articles README following repo conventions
argument-hint: "<url> [url...]"
---

Add the following article(s) to the **awesome-django-articles** list, matching every existing
convention in the repo. Do not invent your own style.

URLs to add:

$@

---

## 0. Locate the repo

Work in the `awesome-django-articles` checkout (the one whose `README.md` starts with
`# awesome-django-articles` and an `[![Awesome](https://awesome.re/badge.svg)]` badge). If the
current directory is not that repo, stop and ask for its path — never edit an unrelated README.

## 1. Read the current state first

Before touching anything:

- `grep -n '^### ' README.md` → the authoritative, current section list and order.
- Read the full body of every section you plan to write to.
- Read the Table of Contents block near the top.

Never rely on a remembered or hardcoded section list; the file evolves.

## 2. Verify each link (mandatory — this is the repo's PR checklist)

For every URL:

1. **It must resolve to live content.** Fetch it (`fetch_content`). Caktus Group and some other
   blogs 404 naive fetchers while the page is perfectly live — if a fetch fails, fall back to
   `web_search` before concluding a link is dead.
2. **The link text must be the article's exact published title.** Not a paraphrase, not a
   shortened form. `Django and PostgreSQL` ≠ `Django + PostgreSQL`.
3. **Find the credited author(s).** Use the page byline, not the domain owner or the publishing
   organisation, unless the organisation genuinely is the credited author.

If a URL is truly dead, or you cannot establish the real title, **skip it and report why** —
do not guess.

## 3. De-duplicate

For each URL, grep the README for the URL and its normalised variants before adding:

- with and without trailing slash
- `http://` vs `https://`, `www.` vs bare host
- stripped of `?utm_*` and other query params
- also grep for the article title, in case it is already listed under a different URL

If it is already present, skip it and say so.

## 4. Choose the section

Pick the single best-fitting existing section. Current sections (verify against step 1):

About Django · API Development · Architecture · Authentication & Permissions · Background Tasks ·
Django Admin · Django ORM / Database · Caching · Contributing · Debugging · Dependency Management ·
Deployment · Encryption · File Uploads · Frontend Integration · HTMX · Job Hunting ·
Learning Django · Logging · Models · Multitenancy · Performance / Scaling · Profiling ·
Request / Response · Security · Serverless · Settings · Signals · Single-File Django Projects ·
Testing · Time Zones · Type Hints · Views · Websockets

Rules:

- **Do not create a new section** unless nothing existing fits at all. If you must, add the
  heading to the body *and* to the Table of Contents, alphabetically in the TOC, and say so
  explicitly in your report and in the commit body.
- **Never reorder or rename existing sections.** Body order is mostly alphabetical but has legacy
  exceptions (e.g. `Django Admin` and `Django ORM / Database` sit before `Caching`). Preserve it.
- **Never touch the `Sources` section** unless the user hands you a newsletter / aggregator /
  feed to add there, in which case use
  ` - [Name](https://…/?utm_source=awesome-django-articles)`.

## 5. Insert the entry

Exact line format — one leading space, hyphen, space, markdown link, optional byline:

```
 - [<exact article title>](<url>) by <Author Name>
```

Byline rules:

- Single author → `by Jane Doe`
- Two authors → `by Jane Doe & John Smith` (literal ` & `, as in existing entries)
- Three or more → `by A, B & C`
- No individually credited author (e.g. a company or newsletter post) → **omit ` by …` entirely**.
  Never substitute the publisher name.
- Preserve non-ASCII names and diacritics exactly (`Anže Pečar`, `Henryk Plötz`, `J.V. Zammit`).

Placement:

- Insert **alphabetically by title**, case-insensitive, ignoring a leading `A`/`An`/`The` for
  sorting. A few legacy entries sit unsorted at the end of some sections — leave them alone and
  insert yours in the correct sorted position.
- Multi-part series use superscript part markers directly after the title, matching siblings:
  `Database generated columns⁽²⁾: …`. If you add a part to an existing series, match its markers.

Formatting hygiene:

- Blank line before each `### Heading`, blank line after it, blank line between sections.
- No trailing whitespace. File ends with a single newline.
- **Preserve typography byte-for-byte.** Curly apostrophes and quotes (`’`, `“`, `”`), en/em
  dashes and existing Unicode must survive untouched. Do not "normalise" them.

## 6. Keep the diff minimal — verify before committing

Run `git diff` and confirm **every changed line is one you intended**. The diff must consist only
of added entry lines (plus TOC lines if you added a section). If any pre-existing line shows as
modified, you broke its formatting or typography — restore it and re-apply your addition
surgically (a byte-level `python3` replace is safer than a whole-block rewrite when Unicode is
involved).

Then run the repo's hooks if available:

```
pre-commit run --files README.md
```

Hooks in this repo: `end-of-file-fixer`, `trailing-whitespace`
(`--markdown-linebreak-ext=md`), and `codespell --write-changes`. Note that codespell rewrites
words in place — re-read `git diff` afterwards and reject any change it made to an article title,
author name or URL. Commit titles in this repo contain real typos from the past; do not "fix"
existing entries.

## 7. Commit

Follow the existing message style (`git log --oneline -20` to re-check). Imperative subject,
no trailing period, no scope prefix, no Conventional Commits.

- One article → `Add "<exact title>" by <Author>`
  or `Add <short descriptive title> by <Author>`
- Several articles → `Add <N> articles about <topic>` /
  `Added <N> more articles via <source>` with a body listing each one, e.g.
  `- <Section>: <title> by <Author>` or a numbered list with `→ <Section>`
- Grouped by one author → `Add <N> articles by <Author> (<blog name>)`
- New section → mention it in the body, including where it was placed alphabetically
  (e.g. `in a new Type Hints section, placed alphabetically between Time Zones and Views`)
- Skipped or ambiguous entries → explain in the body (e.g. `the article didn't clearly credit an
  individual author on the page, so I left it without a byline`)

**Do not push.** Commit locally and let the user push. Never amend or rebase a commit that is
already on `origin` — add a follow-up commit instead.

## 8. Report back

A compact table: `URL → section → title → author(s) → added / skipped (reason)`, then the commit
hash and subject. Flag every judgement call: skipped duplicates, dead links, missing bylines,
near-miss sections, and anything codespell altered.
