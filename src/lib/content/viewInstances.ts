/**
 * Visual like state per *viewing instance* of a post.
 *
 * A viewing instance starts when a post scrolls into view and ends when another
 * post becomes active. The persisted like (server `feed.liked`, used for the
 * aggregate count and XP) is separate and is never reset by this module.
 */
export interface ViewInstances {
  /** completed visits per post id; the current instance key is `${id}#${visits[id] ?? 0}` */
  visits: Record<string, number>;
  /** heart state keyed by instance key; absent = not liked in this instance */
  liked: Record<string, boolean>;
}

export const EMPTY_INSTANCES: ViewInstances = { visits: {}, liked: {} };

export const instanceKey = (s: ViewInstances, postId: string) => `${postId}#${s.visits[postId] ?? 0}`;

export const isLikedInInstance = (s: ViewInstances, postId: string) => s.liked[instanceKey(s, postId)] === true;

export function setInstanceLike(s: ViewInstances, postId: string, liked: boolean): ViewInstances {
  return { ...s, liked: { ...s.liked, [instanceKey(s, postId)]: liked } };
}

/** End the current instance of one post: its next appearance starts unliked. Other posts are untouched. */
export function endInstance(s: ViewInstances, postId: string): ViewInstances {
  const old = instanceKey(s, postId);
  const { [old]: _dropped, ...liked } = s.liked;
  return { visits: { ...s.visits, [postId]: (s.visits[postId] ?? 0) + 1 }, liked };
}
