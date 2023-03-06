# frozen_string_literal: true

# filter only the top level replies by default
::TopicView.apply_custom_default_scope do |scope, topic_view|
  scope =
    scope.where(
      "posts.reply_to_post_number = 1 OR posts.reply_to_post_number IS NULL",
    ) if SiteSetting.nested_posts_enabled

  scope
end

# preload the nested replies into the posts
::TopicView.on_preload do |topic_view, topic_view_options|
  next if !SiteSetting.nested_posts_enabled

  post_numbers = topic_view.posts.map(&:post_number)
  # THIS IS A VERY LIMITED QUERY USED ONLY AS PROOF OF CONCEPT
  # IT DOES NOT FETCH RECURSIVE REPLIES
  # TODO: (saquetim) Write the actual query taking the above into account
  nested_replies =
    Post.where(topic_id: topic_view.topic.id, reply_to_post_number: post_numbers).secured(
      topic_view.guardian,
    ).order(created_at: :asc)

  topic_view.posts.each do |post|
    next if post.post_number == 1

    post.nested_replies = nested_replies.select { |nr| nr.reply_to_post_number == post.post_number }
  end
end
