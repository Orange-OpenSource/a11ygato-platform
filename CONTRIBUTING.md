## Commit Messages

Commit messages should follow the Semantic Commit Messages format:

```
label(namespace): title

description

footer
```

1. *label* is one of the following:
    - `fix` - bug fixes.
    - `feat` - features.
    - `docs` - changes to docs, e.g. `docs(api.md): ..` to change documentation.
    - `test` - changes to tests infrastructure.
    - `refactor` - refactoring production code, eg. renaming a variable
    - `style` - code style: spaces/alignment/wrapping etc.
    - `chore` - build-related work, e.g. docker / github / npm / etc.
2. *namespace* is put in parenthesis after label and is optional.
3. *title* is a brief summary of changes.
4. *description* is **optional**, new-line separated from title and is in present tense.
5. *footer* is **optional**, new-line separated from *description* and contains "close" / "fix" attribution to issues.
6. *footer* should also include "BREAKING CHANGE" if current API clients will break due to this change. It should explain what changed and how to get the old behavior.

Example:

```
fix(Page): fix page.pizza method

This patch fixes page.pizza so that it works with iframes.

Close #123, #234 and #333

BREAKING CHANGE: page.pizza now delivers pizza at home by default.
To deliver to a different location, use "deliver" option:
  `page.pizza({deliver: 'work'})`.
```

## Module life cycles

`a11ygato-platform` and all its modules have a `package.json` file and thus a version. They are all kept in sync (same version number).

Only 2 modules are published on npmjs.org:
- `@a11ygato/cli`
- `@a11ygato/audit-engine`

As you can see they are published under the `@a11ygato` organisation.

## Managing GIT branches

No need to use a complex workflow like GIT Flow. Let's keep it simple. I prefer the spirit of Github or Gitlab flow.

### Development

- The master branch contains at all time the latest version of code (except feature branches not merged obviously)
- Each new feature/fix is develop in its own branch (which should be tested by a CI process before merging into master).
    - TODO: migrate from jenkins to travis

## The release process

### New version

In order to create a new version, you can use the following command: 

```bash
npm run release --new-version <x.x.x>
```

it will reinstall npm dependencies, bump all `package[-lock].json` files, create a commit and tag and push every thing.

### Publish to NPM

In order to publish to npmjs.org, you can use the following command:

```bash
npm run dist
```
