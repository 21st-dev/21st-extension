export interface ComponentSearchResult {
  id: number;
  name: string;
  preview_url: string;
  video_url: string;
  demo_slug: string;
  user_id: string;
  component_data: {
    name: string;
    description: string;
    code: string;
    component_slug: string;
    install_command: string;
  };
  user_data: {
    name: string;
    username: string;
    image_url: string;
    display_image_url: string;
    display_name: string;
    display_username: string;
  };
  usage_data: {
    total_usages: number;
    views: number;
    downloads: number;
    prompt_copies: number;
    code_copies: number;
  };
}
