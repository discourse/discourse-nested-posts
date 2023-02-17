# frozen_string_literal: true
module NestedPosts::PostExtension
  def self.prepended(base)
    base.attr_accessor(:nested_replies)
  end
end
