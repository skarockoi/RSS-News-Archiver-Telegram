export const TELEGRAM_TOKEN = "";
export const TELEGRAM_CHAT = "";
export const RSS_URL = "";
export const PAYWALL_STRING = "subscribe to our"; // example string
export const INTERVAL_MS = 60_000;
export const IGNORE_ARTICLE_AFTER_MS = 3_600_000;

export interface RSS {
  description: string;
  items: Article[];
  link: string;
}

// this interface worked for my specific usecase, you might need to adjust it to yours
export interface Article {
  id: string;
  title: string;
  published: number;
  link: string;
  author: string;
  thumbnail: string;
  description: string;
  media: { thumbnail: { url: string } };
}