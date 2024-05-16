# frozen_string_literal: true

# name: discourse-nested-posts
# about: Enables displaying posts in a nested way by default
# version: 0.0.1
# authors: Sérgio Saquetim
# url: TODO
# required_version: 3.0.0.beta1

enabled_site_setting :nested_posts_enabled

after_initialize do
  module ::NestedPosts
    PLUGIN_NAME ||= "discourse-nested-posts".freeze

    def self.enabled?
      SiteSetting.nested_posts_enabled
    end
  end

  require_relative "app/models/post_extension"
  require_relative "lib/topic_view_extension"

  reloadable_patch { Post.prepend(NestedPosts::PostExtension) }

  add_to_serializer(:post, :nested_replies) do
    ActiveModel::ArraySerializer.new(
      object.nested_replies || [],
      each_serializer: PostSerializer,
      scope: scope,
      root: false,
    ).as_json
  end

  add_to_serializer(:post, :include_nested_replies?) do
    NestedPosts.enabled? && object.nested_replies.present?
  end
end
