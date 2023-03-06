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
  }
};

function includePostAttributes(api) {
  api.includePostAttributes("nested_replies");
}

function readSerializedRepliesBelowForPost(api, container) {
  api.modifyClass("model:post-stream", {
    pluginId: PLUGIN_ID,
    appendPost(post) {
      console.log(post);
      if (post.reply_to_post_number) {
        debugger
        this.posts[post.reply_to_post_number - 1];
        return post;

      }

      this._initUserModels(post);
      const stored = this.storePost(post);
      console.log(stored);
      if (stored) {
        const posts = this.posts;

        if (!posts.includes(stored)) {
          if (!this.loadingBelow) {
            this.postsWithPlaceholders.appendPost(() => posts.pushObject(stored));
          } else {
            posts.pushObject(stored);
          }
        }

        if (stored.get("id") !== -1) {
          this.set("lastAppended", stored);
        }
      }
      return post;
    },
    stagePost(post, user) {
      // We can't stage two posts simultaneously
      if (this.stagingPost) {
        return "alreadyStaging";
      }

      this.set("stagingPost", true);

      const topic = this.topic;
      topic.setProperties({
        posts_count: (topic.get("posts_count") || 0),
        last_posted_at: new Date(),
        "details.last_poster": user,
        highest_post_number: (topic.get("highest_post_number") || 0)
      });

      post.setProperties({
        post_number: topic.get("highest_post_number"),
        topic,
        created_at: new Date(),
        id: -1
      });

      // If we're at the end of the stream, add the post
      if (this.loadedAllPosts) {

        return "staged";
      }

      return "offScreen";
    },

    refresh(opts) {
      if (opts.forceLoad) return this._super({ ...opts });
      this.set("loaded", false);
      return this._super({ ...opts, forceLoad: true });
    }
  });
  api.modifyClass("controller:topic", {
    pluginId: PLUGIN_ID,

    bottomVisibleChanged(event) {
      alert("here");
      console.log(event);
      const { post, refresh } = event;

      const postStream = this.get("model.postStream");
      const lastLoadedPost = postStream.get("posts.lastObject");

      if (
        lastLoadedPost &&
        lastLoadedPost === post &&
        postStream.get("canAppendMore")
      ) {
        postStream.appendMore().then(() => refresh());
        // show loading stuff
        refresh();
      }
    }
    
  });
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
    }
  });
}

// TODO (saquetim) export this function in core:widgets/post.js to reuse it here
function transformWithCallbacks(post) {
  let transformed = transformBasicPost(post);
  postTransformCallbacks(transformed);
  return transformed;
}
