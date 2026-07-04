// Route stub — visual content is rendered by TabShell in the root layout, which
// resolves the server-only flags (dmEnabled/revolveEnabled/previewMode) and threads
// them into the single PublicFeedClient instance. Rendering the client here too would
// double-mount the feed (see the TabShell keep-alive pattern shared with people/spark/
// tranche, which are all `return null` stubs for the same reason).
export default function PublicFeedPage() {
  return null;
}
