import Service from "@ember/service";

export default class NestedPostsService extends Service {
  get isEnabled() {
    return this.siteSettings.nested_posts_enabled;
  }
}
