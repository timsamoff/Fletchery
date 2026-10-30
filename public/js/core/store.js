// The storage interface. Every backend reads and writes paths relative to story-bible/
// and refuses a change when the stored version no longer matches the one the caller saw.

export class StoreConflict extends Error {
  constructor(current) {
    super('The file changed in storage.');
    this.current = current; // { exists, content, version }
  }
}

export class StoreError extends Error {}

// Backend for the local edition: the Node server in server/.
export class LocalServerStore {
  async info() {
    return this.#call('GET', '/api/project');
  }

  // Returns [{ name, type: 'file' | 'dir' }], or [] when the folder doesn't exist.
  async list(dir = '') {
    return (await this.#call('GET', `/api/list?dir=${encodeURIComponent(dir)}`)).entries;
  }

  // Returns { exists, content, version }. version is null when the file doesn't exist.
  async read(path) {
    return this.#call('GET', `/api/file?path=${encodeURIComponent(path)}`);
  }

  // Pass baseVersion null to create a file that must not exist yet. Returns the new version.
  async write(path, content, baseVersion) {
    return (await this.#call('PUT', '/api/file', { path, content, baseVersion })).version;
  }

  async delete(path, baseVersion) {
    await this.#call('DELETE', '/api/file', { path, baseVersion });
  }

  async move(from, to, baseVersion) {
    return (await this.#call('POST', '/api/move', { from, to, baseVersion })).version;
  }

  // Calls onChange({ path, version }) for each outside change. Returns a function that stops listening.
  changes(onChange) {
    const source = new EventSource('/api/events');
    source.addEventListener('change', (event) => onChange(JSON.parse(event.data)));
    return () => source.close();
  }

  async #call(method, url, body) {
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new StoreError('Fletcherling isn’t responding. Is it still running in the terminal?');
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) throw new StoreConflict(data.current);
    if (!res.ok) throw new StoreError(data.error ?? `The request failed (${res.status}).`);
    return data;
  }
}
