import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getBridgeUrl(reqUrl?: string): string {
  // Check local file if running on same host
  try {
    const configPath = '/root/.config/bridge_tunnel_url';
    if (fs.existsSync(configPath)) {
      const saved = fs.readFileSync(configPath, 'utf8').trim();
      if (saved.startsWith('http')) return saved;
    }
  } catch (e) {}

  return process.env.WHATSAPP_BRIDGE_URL || 'https://0a1e93684b55d3.app.lhr.life';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customUrl = searchParams.get('bridgeUrl');
  const targetBridgeUrl = (customUrl && customUrl.startsWith('http')) ? customUrl.trim() : getBridgeUrl();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const resp = await fetch(`${targetBridgeUrl}/health`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      return NextResponse.json({
        ok: true,
        bridgeUrl: targetBridgeUrl,
        connected: data.connected,
        phone: data.phone || '5511995685756',
        activeUserJid: data.activeUserJid
      });
    }

    return NextResponse.json({
      ok: false,
      bridgeUrl: targetBridgeUrl,
      error: `Bridge HTTP ${resp.status}`
    }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      bridgeUrl: targetBridgeUrl,
      error: err.name === 'AbortError' ? 'Bridge timeout (offline)' : err.message
    }, { status: 503 });
  }
}
