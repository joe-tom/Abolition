const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = {
  async createSession(topic: string) {
    const res = await fetch(`${BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listSessions() {
    const res = await fetch(`${BASE}/api/sessions`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getSession(sessionId: string) {
    const res = await fetch(`${BASE}/api/sessions/${sessionId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getChapters(sessionId: string) {
    const res = await fetch(`${BASE}/api/sessions/${sessionId}/chapters`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getReferences(sessionId: string) {
    const res = await fetch(`${BASE}/api/sessions/${sessionId}/references`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async uploadFile(sessionId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/api/sessions/${sessionId}/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async resumeStream(sessionId: string, response: string): Promise<Response> {
    return fetch(`${BASE}/api/sessions/${sessionId}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    });
  },

  getDownloadUrl(sessionId: string): string {
    return `${BASE}/api/sessions/${sessionId}/download`;
  },
};
