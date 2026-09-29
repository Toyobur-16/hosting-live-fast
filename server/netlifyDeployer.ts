import https from 'https';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { getWebsiteSettings } from './staticWebsitesManager';

const DEFAULT_NETLIFY_TOKEN = 'nfp_DPwmDu45wrHc2eiyQeKZJ4EXrYnLqKdL0da9';

export function getNetlifyToken(): string {
  const settings = getWebsiteSettings();
  if (settings.netlifyToken && settings.netlifyToken.trim()) {
    return settings.netlifyToken.trim();
  }
  return process.env.NETLIFY_AUTH_TOKEN || DEFAULT_NETLIFY_TOKEN;
}

interface NetlifyRequestOptions {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  contentType?: string;
  isBinary?: boolean;
}

function makeNetlifyRequest<T = any>(options: NetlifyRequestOptions): Promise<{ statusCode: number; data: T }> {
  const token = getNetlifyToken();
  return new Promise((resolve, reject) => {
    let payload: Buffer | null = null;
    let contentType = options.contentType || 'application/json';

    if (options.body) {
      if (Buffer.isBuffer(options.body)) {
        payload = options.body;
      } else if (typeof options.body === 'string') {
        payload = Buffer.from(options.body, 'utf-8');
      } else {
        payload = Buffer.from(JSON.stringify(options.body), 'utf-8');
      }
    }

    const headers: Record<string, string | number> = {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'HostingLiveFast-BotHost/1.0'
    };

    if (payload) {
      headers['Content-Type'] = contentType;
      headers['Content-Length'] = payload.length;
    }

    const req = https.request(
      {
        hostname: 'api.netlify.com',
        port: 443,
        path: options.path,
        method: options.method,
        headers
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const bodyStr = Buffer.concat(chunks).toString('utf-8');
          let parsedData: any = bodyStr;
          try {
            parsedData = JSON.parse(bodyStr);
          } catch {
            // Keep string
          }
          resolve({
            statusCode: res.statusCode || 500,
            data: parsedData
          });
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

/**
 * Creates a site on Netlify with the desired slug
 */
export async function createNetlifySite(slug: string): Promise<{
  success: boolean;
  siteId?: string;
  name?: string;
  url?: string;
  sslUrl?: string;
  error?: string;
}> {
  try {
    // 1. Try with the clean slug
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30);
    let res = await makeNetlifyRequest({
      path: '/api/v1/sites',
      method: 'POST',
      body: { name: cleanSlug }
    });

    // 2. If name is already taken globally on Netlify (422), try with random suffix
    if (res.statusCode === 422 || (res.data && res.data.errors && res.data.errors.name)) {
      const fallbackName = `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      res = await makeNetlifyRequest({
        path: '/api/v1/sites',
        method: 'POST',
        body: { name: fallbackName }
      });
    }

    // 3. If still error, create without name (Netlify auto-generates name)
    if (res.statusCode < 200 || res.statusCode >= 300) {
      res = await makeNetlifyRequest({
        path: '/api/v1/sites',
        method: 'POST',
        body: {}
      });
    }

    if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.id) {
      const site = res.data;
      const sslUrl = site.ssl_url || site.url || `https://${site.name}.netlify.app`;
      return {
        success: true,
        siteId: site.id,
        name: site.name,
        url: site.url,
        sslUrl
      };
    }

    return {
      success: false,
      error: (res.data && (res.data.message || JSON.stringify(res.data))) || `Netlify API error: ${res.statusCode}`
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to connect to Netlify' };
  }
}

/**
 * Zips a local website directory and deploys it to Netlify
 */
export async function deployDirectoryToNetlify(
  siteId: string,
  dirPath: string
): Promise<{ success: boolean; deployId?: string; sslUrl?: string; error?: string }> {
  try {
    if (!fs.existsSync(dirPath)) {
      return { success: false, error: 'Directory does not exist' };
    }

    // Create zip of directory in memory
    const zip = new AdmZip();
    zip.addLocalFolder(dirPath);
    const zipBuffer = zip.toBuffer();

    const res = await makeNetlifyRequest({
      path: `/api/v1/sites/${siteId}/deploys`,
      method: 'POST',
      body: zipBuffer,
      contentType: 'application/zip'
    });

    if (res.statusCode >= 200 && res.statusCode < 300 && res.data) {
      const deploy = res.data;
      const sslUrl = deploy.ssl_url || deploy.deploy_ssl_url || deploy.url;
      return {
        success: true,
        deployId: deploy.id,
        sslUrl
      };
    }

    return {
      success: false,
      error: (res.data && (res.data.message || JSON.stringify(res.data))) || `Deploy error: ${res.statusCode}`
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to deploy to Netlify' };
  }
}

/**
 * Configure Custom Domain for a Netlify Site (e.g. mybrand.com or www.mybrand.com)
 */
export async function setNetlifyCustomDomain(
  siteId: string,
  customDomain: string | null
): Promise<{ success: boolean; customDomain?: string; sslUrl?: string; error?: string }> {
  try {
    const cleanDomain = customDomain ? customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') : null;

    const res = await makeNetlifyRequest({
      path: `/api/v1/sites/${siteId}`,
      method: 'PUT',
      body: {
        custom_domain: cleanDomain || null
      }
    });

    if (res.statusCode >= 200 && res.statusCode < 300 && res.data) {
      return {
        success: true,
        customDomain: res.data.custom_domain || undefined,
        sslUrl: res.data.ssl_url || (cleanDomain ? `https://${cleanDomain}` : undefined)
      };
    }

    return {
      success: false,
      error: (res.data && (res.data.message || JSON.stringify(res.data))) || `Domain error: ${res.statusCode}`
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to set custom domain' };
  }
}

/**
 * Delete site from Netlify
 */
export async function deleteNetlifySite(siteId: string): Promise<boolean> {
  try {
    const res = await makeNetlifyRequest({
      path: `/api/v1/sites/${siteId}`,
      method: 'DELETE'
    });
    return res.statusCode >= 200 && res.statusCode < 300;
  } catch {
    return false;
  }
}
