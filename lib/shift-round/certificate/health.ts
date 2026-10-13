import { buildCertificateContent } from "./content";
import { FIXTURE_PUBLIC_ID, FIXTURE_SNAPSHOTS } from "./fixtures";
import { renderCertificatePng } from "./render";
import { fetchCertificate } from "./rpc";

/** Valid format, never issued: the public RPC must say certificate_not_found. */
export const HEALTH_MISSING_ID = "0000000000000000";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

export interface HealthResult {
  ok: boolean;
  renderer: boolean;
  rpc: boolean;
}

export async function checkCertificateHealth(deps: {
  render?: typeof renderCertificatePng;
  fetch?: typeof fetchCertificate;
} = {}): Promise<HealthResult> {
  const render = deps.render ?? renderCertificatePng;
  const lookup = deps.fetch ?? fetchCertificate;

  const [renderer, rpc] = await Promise.all([
    (async () => {
      try {
        const content = buildCertificateContent(FIXTURE_SNAPSHOTS.long_thai, FIXTURE_PUBLIC_ID);
        const png = await render(content, "square");
        return png.length > 1000 && PNG_SIGNATURE.every((byte, i) => png[i] === byte);
      } catch {
        return false;
      }
    })(),
    (async () => {
      try {
        return (await lookup(HEALTH_MISSING_ID)).kind === "not_found";
      } catch {
        return false;
      }
    })(),
  ]);
  return { ok: renderer && rpc, renderer, rpc };
}
