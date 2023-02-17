# frozen_string_literal: true

require "rails_helper"

RSpec.describe TopicView do
  fab!(:user) { Fabricate(:user) }
  fab!(:topic) { Fabricate(:topic, user: user) }
  fab!(:post) { Fabricate(:post_with_long_raw_content, topic: topic, user: user) }
  fab!(:post2) { Fabricate(:post, topic: topic, user: user) }
  fab!(:post2_replies) do
    Fabricate.times(5, :post, topic: topic, user: user, reply_to_post_number: post2.post_number)
  end
  fab!(:post3) { Fabricate(:post, topic: topic, user: user) }
  fab!(:post3_replies) do
    Fabricate.times(3, :post, topic: topic, user: user, reply_to_post_number: post3.post_number)
  end

  before { SiteSetting.nested_posts_enabled = true }

  describe "nested posts" do
    it "filters the top level replies by default" do
      topic_view = TopicView.new(topic.id, user)

      expect(topic_view.posts.size).to eq(2)
      expect(topic_view.posts).to contain_exactly(post2, post3)
    end

    it "preload the expected nested replies" do
      topic_view = TopicView.new(topic.id, user)

      expected_posts = topic_view.posts
      expect(expected_posts.size).to eq(2)

      expected_replies = expected_posts.map(&:nested_replies)
      expect(expected_replies[0]).to contain_exactly(*post2_replies)
      expect(expected_replies[1]).to contain_exactly(*post3_replies)
    end
  end
end
