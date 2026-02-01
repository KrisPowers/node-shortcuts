# Node Shortcuts

**Node Shortcuts** is a lightweight Visual Studio Code snippet collection that provides fast, consistent shortcuts for importing **Node.js core modules** using the modern `node:` specifier.

Designed for developers who work close to Node’s standard library and want **zero-dependency, muscle-memory-friendly imports**.

---

## Features

- 🚀 Short aliases for Node.js core module imports
- 📦 Uses modern `node:` import syntax
- 🧠 Consistent `@module` prefix convention
- 🛠 No runtime code — snippets only
- 🔒 Safe, local, and non-invasive

---

## Example

Type:
```text
@http
```

Expands to:

```javascript
import http from 'node:http';
```

## Included Modules
Covers all major Node.js core modules, including:

> Networking (http, https, net, tls, dns)
>
> File system (fs, fs/promises, path)
>
> System & process (os, process, worker_threads)
>
> Utilities (util, events, assert, crypto)
>
> Streams, buffers, timers, and more
>

## Installation
```bash
npm i node-shorcuts -D
```

.vscode/node.code-snippets
Snippets load automatically when the workspace opens.

### Node Version
<i>Requires Node.js 16.0.0+<br></i>

### License
MIT