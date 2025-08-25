import TelegramBot, { Message } from "node-telegram-bot-api";
import Inliner from "inliner";
import fs from "fs/promises";
import pkg from "rss-to-json"; const { parse } = pkg;
import { FixedQueue } from "./FixedQueue.js";
import { IGNORE_ARTICLE_AFTER_MS, RSS_URL, INTERVAL_MS, TELEGRAM_CHAT, TELEGRAM_TOKEN, PAYWALL_STRING, Article, RSS } from "./config.js";

const telegram = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const articleHistory = new FixedQueue<Article>(200); // save the last 200 articles to prevent duplicate posting

async function task() {
    const rss: RSS = await parse(RSS_URL)
        .catch(err => {
            console.error("Failed to fetch RSS:", err);
            return { items: [] } as RSS;
        });

    const sortedArticles: Article[] = rss.items.sort(((a, b) => a.published - b.published)) // sort by date

    for (const article of sortedArticles) {
        if (Date.now() - article.published > IGNORE_ARTICLE_AFTER_MS) // skip if article is older than X
            continue;

        if (articleHistory.contains(q => q.title === article.title || q.description === article.description)) // this isn't just a bad lazy check, sometimes articles get corrected right after they were published, this prevents duplicate posting.
            continue;

        const filename = `${article.published}.html`;
        const html = await inlineArticleHtml(article.link)
            .catch(err => {
                console.error("Error inlining HTML for", article.id, err);
                return null;
            });

        if (!html) { continue; }

        const wrote = await fs.writeFile(filename, html)
            .then(() => true)
            .catch(err => {
                console.error("Error writing file", filename, err);
                return false;
            });

        const photoMsg = await sendArticlePhoto(article)
            .catch(err => {
                console.error("Error sending photo for", article.id, err);
                return null;
            });
        if (!photoMsg) {
            await cleanupFile(filename);
            continue;
        }

        await sendArticleDocument(article, html, filename)
            .catch(err => {
                console.error("Error sending document for", article.id, err);
            });

        articleHistory.enqueue(article);
        await cleanupFile(filename);
    }
}

async function inlineArticleHtml(link: string): Promise<string> {
    return new Promise((resolve, reject) => {
        new Inliner(link, (err, resultHtml) => {
            if (err) reject(err);
            else resolve(resultHtml);
        });
    });
}

async function sendArticlePhoto(article: any): Promise<Message> {
    const caption = `<b>${article.title}</b>\n\n${article.description}`;
    return telegram.sendPhoto(
        TELEGRAM_CHAT,
        article.media.thumbnail.url,
        {
            caption,
            parse_mode: "HTML",
        }
    );
}

async function sendArticleDocument(
    article: any,
    html: string,
    filename: string,
): Promise<Message> {
    const caption = html.includes(PAYWALL_STRING) // checks for specific string to detect a paywall 
        ? `<a href="https://archive.today/?run=1&url=${encodeURIComponent(article.link)}">Click here to remove the paywall.</a>` // let archive.today handle removing the paywall
        : "Here's the article.";

    return telegram.sendDocument(
        TELEGRAM_CHAT,
        filename,
        {
            disable_notification: true,
            caption,
            parse_mode: "HTML",
        },
        {
            filename: "article.html",
            contentType: "text/html",
        }
    );
}

async function cleanupFile(filename: string) {
    return fs.unlink(filename).catch(err => {
        console.error("Failed to delete file:", filename, err);
    });
}

const initialRss = await parse(RSS_URL)
    .catch(err => {
        console.error("Failed initial RSS fetch:", err);
        return { items: [] } as RSS;
    });
for (const article of initialRss.items) {
    articleHistory.enqueue(article);
}

task();
setInterval(task, INTERVAL_MS);