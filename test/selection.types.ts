import { identitySelected, selectedKeys } from "../src/powerbi/index";
import { bindContextMenu } from "../src/rendering/index";

type HostId = { getKey(): string; equals(other: HostId): boolean };
declare const ids: readonly HostId[];
declare const root: SVGSVGElement;

const selected: ReadonlySet<string> = selectedKeys(ids);
identitySelected(ids[0], selected);
identitySelected(ids, selected);
// @ts-expect-error The selection snapshot is a key set taken once, not the raw identities or a manager.
identitySelected(ids[0], ids);

bindContextMenu(root, { enabled: true, identity: () => ids[0], show: (identity: HostId) => identity.getKey() });
// @ts-expect-error The shown identity must be what the identity function returns.
bindContextMenu(root, { enabled: true, identity: () => ids[0], show: (identity: string) => identity });
