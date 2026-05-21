---
description: Start the concept-learner-web Next.js dev server
---

# Run

Start the dev server with:

```sh
source ~/.nvm/nvm.sh && npm run dev
```

- Uses webpack (baked into the `dev` script) to avoid the OS inotify watcher limit that crashes Turbopack.
- Server is ready when the log shows `✓ Ready`.
- Available at http://localhost:3000.
- If the server fails to start, clear the cache first: `rm -rf .next && npm run dev`.
