export type ContextMenuOptions<I> = {
  readonly enabled: boolean;
  /** The caller maps the right-clicked element to its identity (or its empty background identity) */
  readonly identity: (target: EventTarget | null) => I;
  readonly show: (identity: I, position: { readonly x: number; readonly y: number }) => void;
};

const listeners = new WeakMap<GlobalEventHandlers, (event: MouseEvent) => void>();

/** Rebinding replaces the previous listener, so redraws never stack handlers */
export default function bindContextMenu<I>(root: GlobalEventHandlers, options: ContextMenuOptions<I>): void {
  const previous = listeners.get(root);
  if (previous !== undefined) {
    root.removeEventListener("contextmenu", previous);
    listeners.delete(root);
  }
  if (!options.enabled) {
    return;
  }
  const listener = (event: MouseEvent) => {
    options.show(options.identity(event.target), { x: event.clientX, y: event.clientY });
    event.preventDefault();
  };
  root.addEventListener("contextmenu", listener);
  listeners.set(root, listener);
}
