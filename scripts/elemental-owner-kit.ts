/**
 * The Elemental problem-owner kit, for the team.
 *
 *   pnpm elemental:owner-kit link <org> [earth|water|air|fire|aether]
 *     Prints the upload link to send one organisation. The org is a short
 *     slug (mekong-school); their files land under elemental-owners/<org>/.
 *
 *   pnpm elemental:owner-kit list [org]
 *     Lists what owners have uploaded, newest last, with public URLs.
 *
 * Links are signed with the production B2 key, so the script reads
 * .env.production (see package.json). A link made with another key won't
 * open the upload form on passionseed.org.
 */
import { b2 } from "../lib/backblaze";
import { isValidOrg, ownerKitPath, parseOwnerElement, signOwnerLink } from "../lib/hackathon/elemental/owner-link";

const SITE = "https://www.passionseed.org";

async function main() {
  const [command, org, el] = process.argv.slice(2);

  if (command === "link") {
    if (!isValidOrg(org)) {
      console.error("Usage: link <org> [element]. The org is lowercase letters, digits and dashes, like mekong-school.");
      process.exit(1);
    }
    const element = parseOwnerElement(el);
    if (el && !element) {
      console.error(`Unknown element "${el}". Use earth, water, air, fire or aether.`);
      process.exit(1);
    }
    console.log(SITE + ownerKitPath(org, element, signOwnerLink(org, element)));
    return;
  }

  if (command === "list") {
    if (org && !isValidOrg(org)) {
      console.error(`Invalid org "${org}".`);
      process.exit(1);
    }
    const objects = await b2.listObjects(org ? `elemental-owners/${org}/` : "elemental-owners/");
    if (objects.length === 0) {
      console.log("No uploads yet.");
      return;
    }
    for (const o of objects) {
      const mb = (o.size / 1024 / 1024).toFixed(1).padStart(8);
      console.log(`${o.lastModified?.toISOString() ?? ""}  ${mb} MB  ${b2.publicUrl(o.key)}`);
    }
    return;
  }

  console.error("Usage: pnpm elemental:owner-kit link <org> [element] | list [org]");
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
