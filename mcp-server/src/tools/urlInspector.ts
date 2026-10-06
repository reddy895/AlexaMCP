import { InspectUrlOutput } from '../schemas/tools.js';

const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'work', 'click', 'link', 'zip', 'mov', 'loan', 'cam',
  'country', 'stream', 'download', 'review', 'kim', 'racing', 'party',
  'date', 'faith', 'bid', 'surf', 'gq', 'ml', 'cf', 'ga', 'tk'
]);

const TRUSTED_DOMAINS = new Map<string, string[]>([
  ['sbi', ['onlinesbi.sbi', 'sbi.co.in', 'statebankofindia.com']],
  ['hdfc', ['hdfcbank.com']],
  ['icici', ['icicibank.com']],
  ['amazon', ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.jobs', 'amazon.science']],
  ['google', ['google.com', 'google.co.in', 'alphabet.com']],
  ['apple', ['apple.com', 'icloud.com']],
  ['microsoft', ['microsoft.com', 'live.com', 'office.com']],
  ['paypal', ['paypal.com']],
  ['netflix', ['netflix.com']],
]);

export async function inspectUrlTool(rawUrl: string): Promise<InspectUrlOutput> {
  const suspiciousIndicators: string[] = [];
  const redirects: string[] = [];
  let risk: 'low' | 'medium' | 'high' = 'low';

  let parsed: URL;
  try {
    let sanitized = rawUrl.trim();
    if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
      sanitized = 'https://' + sanitized;
    }
    parsed = new URL(sanitized);
  } catch (err) {
    return {
      url: rawUrl,
      domain: 'invalid-url',
      https: false,
      redirects: [],
      suspicious_indicators: ['Invalid or malformed URL syntax'],
      risk: 'high'
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const search = parsed.search.toLowerCase();
  const isHttps = parsed.protocol === 'https:';

  if (!isHttps) {
    suspiciousIndicators.push('Insecure protocol: Uses unencrypted HTTP rather than HTTPS');
  }

  // Check IP address hostname
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipRegex.test(hostname)) {
    suspiciousIndicators.push('Host uses raw numeric IP address instead of domain name');
  }

  // Check TLD
  const parts = hostname.split('.');
  const tld = parts[parts.length - 1];
  if (SUSPICIOUS_TLDS.has(tld)) {
    suspiciousIndicators.push(`High-abuse TLD detected (.${tld}) frequently used in disposable phishing infrastructure`);
  }

  // Check Punycode / IDN homoglyphs
  if (hostname.includes('xn--')) {
    suspiciousIndicators.push('Punycode encoded domain (potential internationalized homoglyph spoofing)');
  }

  // Check excessive subdomains
  if (parts.length > 4) {
    suspiciousIndicators.push(`Excessive subdomain depth (${parts.length} segments), typical of dynamic tunneling or spoofing`);
  }

  // Check brand impersonation / typosquatting in hostname
  for (const [brand, legitDomains] of TRUSTED_DOMAINS.entries()) {
    if (hostname.includes(brand)) {
      const isLegit = legitDomains.some(legit => hostname === legit || hostname.endsWith('.' + legit));
      if (!isLegit) {
        suspiciousIndicators.push(
          `Brand impersonation detected: Domain contains '${brand}' but is NOT an official domain (${legitDomains.join(', ')})`
        );
      }
    }
  }

  // Check keywords in path or hostname
  const suspiciousKeywords = [
    'login', 'signin', 'verify', 'account-update', 'secure', 'banking',
    'auth', 'recover', 'wallet', 'kyc', 'validate', 'session', 'confirm'
  ];

  for (const kw of suspiciousKeywords) {
    if (hostname.includes(kw) && !hostname.endsWith('.gov') && !hostname.endsWith('.edu')) {
      suspiciousIndicators.push(`Suspicious keyword '${kw}' embedded in hostname to simulate trusted services`);
      break;
    }
  }

  if (pathname.includes('/login') || pathname.includes('/verify') || pathname.includes('/auth') || pathname.includes('/secure')) {
    suspiciousIndicators.push('Path targets authentication or credential verification endpoints');
  }

  if (search.includes('redirect=') || search.includes('url=') || search.includes('next=')) {
    suspiciousIndicators.push('Open redirect or parameter-based forwarding pattern detected in query string');
  }

  // Attempt safe HEAD request with strict timeout to observe redirects without downloading bodies
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(parsed.toString(), {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DigitalDetective/1.0'
      }
    });
    clearTimeout(timeout);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (location) {
        redirects.push(location);
        try {
          const destUrl = new URL(location, parsed.origin);
          if (destUrl.hostname !== hostname) {
            suspiciousIndicators.push(`Cross-domain redirect to external host: ${destUrl.hostname}`);
          }
        } catch {
          // ignore parsing error
        }
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      // Domain could be offline, sinkholed, or unresolvable
      suspiciousIndicators.push('Domain is currently unreachable or non-responsive to network probe');
    }
  }

  // Calculate risk level based on indicators
  if (
    suspiciousIndicators.some(i => i.includes('impersonation') || i.includes('IP address') || i.includes('Cross-domain')) ||
    suspiciousIndicators.length >= 3
  ) {
    risk = 'high';
  } else if (suspiciousIndicators.length > 0) {
    risk = 'medium';
  } else {
    risk = 'low';
  }

  return {
    url: parsed.toString(),
    domain: hostname,
    https: isHttps,
    redirects,
    suspicious_indicators: suspiciousIndicators,
    risk,
    metadata: {
      subdomainCount: parts.length - 2,
      tld,
      hasCredentialsInUrl: Boolean(parsed.username || parsed.password)
    }
  };
}
