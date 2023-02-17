import { withPluginApi } from "discourse/lib/plugin-api";
import { transformBasicPost } from "discourse/lib/transform-post";
import { postTransformCallbacks } from "discourse/widgets/post-stream";

const PLUGIN_ID = "discourse-nested-posts";

export default {
  name: PLUGIN_ID,

  initialize(container) {
    const nestedPosts = container.lookup("service:nested-posts");

    if (nestedPosts.isEnabled) {
      withPluginApi("1.6.0", (api) => {
        includePostAttributes(api);
        readSerializedRepliesBelowForPost(api, container);
      });
    }
  },
};

function includePostAttributes(api) {
  api.includePostAttributes("nested_replies");
}

function readSerializedRepliesBelowForPost(api, container) {
  api.reopenWidget(`post-contents`, {
    pluginId: PLUGIN_ID,

    defaultState(attrs) {
      const state = this._super(attrs);

      if (attrs.nested_replies) {
        const post = this.findAncestorModel();
        const store = container.lookup("service:store");

        const topicUrl = post ? post.get("topic.url") : null;

        state.repliesBelow = attrs.nested_replies.map((p) => {
          const reply = store.createRecord("post-reply", p);

          // TODO (saquetim) copied from widgets/post.js
          // ideally we should refator this in core, extracting a function
          // that can be used here
          const result = transformWithCallbacks(reply);

          // these would conflict with computed properties with identical names
          // in the post model if we kept them.
          delete result.new_user;
          delete result.deleted;
          delete result.shareUrl;
          delete result.firstPost;
          delete result.usernameUrl;

          result.customShare = `${topicUrl}/${reply.post_number}`;
          result.asPost = this.store.createRecord("post", result);
          return result;
        });
      }

      return state;
    },
  });
}

// TODO (saquetim) export this function in core:widgets/post.js to reuse it here
function transformWithCallbacks(post) {
  let transformed = transformBasicPost(post);
  postTransformCallbacks(transformed);
  return transformed;
}
