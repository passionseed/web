import type { QuestApi } from "./api";

const versions = new WeakMap<QuestApi, Promise<number>>();

/** The database's quest schema, read once per api (a failed read is tried again next time). */
export function schemaOf(api: QuestApi): Promise<number> {
  let version = versions.get(api);
  if (!version) {
    const read = api.call<number>("shift_quest_schema_version").then((v) => Number(v));
    version = read;
    versions.set(api, read);
    read.catch(() => {
      if (versions.get(api) === read) versions.delete(api);
    });
  }
  return version;
}
