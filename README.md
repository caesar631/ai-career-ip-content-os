# AI Career IP Content OS

This repository helps a content owner check whether one core theme is ready to publish. It does not publish content or call paid video models.

## Run the readiness check

```powershell
npm run content:check -- fixtures/ready-content-package.json
```

A `ready` result currently requires one content package with:

- a core theme with a career problem, demonstration, and judgement;
- exactly one approved platform version for Xiaohongshu, Douyin, Video Account, and Bilibili;
- one public basic asset with a name and reference; and
- no required paid-video-generation brief.

The repository also exposes the same public command through `bin/content-package-readiness.mjs`.

## First-release boundary

This check prepares content for an owner's decision. It does not post to social platforms, reply to users, deliver membership content, or start paid-video generation.
