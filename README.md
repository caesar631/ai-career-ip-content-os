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
- no paid-video-generation brief, or a complete brief with
  `paidVideoGenerationBriefApproval` set to `approved`.

The repository also exposes the same public command through `bin/content-package-readiness.mjs`.

## Paid-video generation gate

Set `paidVideoGenerationBrief.isRequired` to `false` when screen recordings, code, or
product prototypes are sufficient. When it is `true`, the brief must contain all of
the following before the package can continue to the normal readiness checks:

- `purpose` — why paid video is necessary;
- `quantity` — a positive number of requested generations;
- `acceptanceCriteria` — what an acceptable result must demonstrate;
- `costEstimate` — a positive estimated cost;
- `stopCondition` — when generation attempts must stop; and
- `paidVideoGenerationBriefApproval: "approved"` — the content owner's explicit
  approval of this paid brief.

`paidVideoGenerationBriefApproval` approves spend on the brief. It is separate from
each platform version's `releaseApproval`, which permits public release.

## First-release boundary

This check prepares content for an owner's decision. It does not post to social platforms, reply to users, deliver membership content, or start paid-video generation.
