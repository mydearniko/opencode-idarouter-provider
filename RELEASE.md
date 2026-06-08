# Release

This package is intended to publish to npm as `opencode-idarouter-provider`.

## First publish

The first publish usually must be done manually because npm trusted publishing is configured from package settings after the package exists.

1. Log in to npm from this repo:

```bash
npm login
```

2. Verify the package:

```bash
npm run check
npm pack --dry-run
```

3. Publish the first version:

```bash
npm publish
```

If npm rejects the publish with a two-factor authentication error, publish with a current authenticator code:

```bash
npm publish --otp=123456
```

If interactive 2FA is not available, create a temporary granular npm access token with read/write package access and bypass 2FA enabled, use it only for the first publish, then revoke it after trusted publishing is configured.

## Configure trusted publishing

After the package exists on npm:

1. Open npmjs.com package settings for `opencode-idarouter-provider`.
2. Add a trusted publisher.
3. Select GitHub Actions.
4. Use these values:

```text
Organization or user: mydearniko
Repository: opencode-idarouter-provider
Workflow filename: publish.yml
Allowed actions: npm publish
```

## Future releases

After trusted publishing is configured, publish by pushing a version tag:

```bash
npm version patch
git push origin main --follow-tags
```

OpenCode instances using an unpinned plugin entry can pick up npm updates on startup:

```json
{
  "plugin": ["opencode-idarouter-provider"]
}
```

Pinned entries stay on that exact version until changed:

```json
{
  "plugin": ["opencode-idarouter-provider@0.1.0"]
}
```
