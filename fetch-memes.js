const { WebClient } = require("@slack/web-api");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
require("dotenv").config();

const token = process.env.SLACK_BOT_TOKEN;
if (!token) {
  console.error("Missing SLACK_BOT_TOKEN in .env");
  process.exit(1);
}

const slack = new WebClient(token);
const CHANNEL_NAME = "uk-memes";
const IMAGES_DIR = path.join(__dirname, "images");

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const request = mod.get(
      url,
      { headers: { Authorization: `Bearer ${token}` } },
      (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        const file = fs.createWriteStream(filepath);
        response.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", reject);
      }
    );
    request.on("error", reject);
  });
}

async function findChannel() {
  let cursor;
  do {
    const result = await slack.conversations.list({ limit: 200, cursor, types: "public_channel,private_channel" });
    const channel = result.channels.find((c) => c.name === CHANNEL_NAME);
    if (channel) return channel.id;
    cursor = result.response_metadata?.next_cursor;
  } while (cursor);
  throw new Error(`Channel #${CHANNEL_NAME} not found`);
}

async function fetchAllMessages(channelId) {
  const messages = [];
  let cursor;
  do {
    const result = await slack.conversations.history({
      channel: channelId,
      limit: 200,
      cursor,
    });
    messages.push(...result.messages);
    cursor = result.response_metadata?.next_cursor;
    console.log(`Fetched ${messages.length} messages...`);
  } while (cursor);
  return messages;
}

const userCache = new Map();

async function resolveUser(userId) {
  if (userCache.has(userId)) return userCache.get(userId);
  try {
    const result = await slack.users.info({ user: userId });
    const name =
      result.user.profile.display_name ||
      result.user.real_name ||
      result.user.name;
    userCache.set(userId, name);
    return name;
  } catch {
    return userId;
  }
}

function getReactionCount(message) {
  if (!message.reactions) return 0;
  return message.reactions.reduce((sum, r) => sum + r.count, 0);
}

function loadExistingMemes() {
  const memesPath = path.join(__dirname, "memes.json");
  if (!fs.existsSync(memesPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(memesPath, "utf-8"));
  } catch {
    return [];
  }
}

async function main() {
  const existing = loadExistingMemes();
  const existingIds = new Set(existing.map((m) => m.id));
  console.log(`Loaded ${existing.length} existing memes from memes.json`);

  console.log(`Looking for #${CHANNEL_NAME}...`);
  const channelId = await findChannel();
  console.log(`Found channel: ${channelId}`);

  console.log("Fetching messages from Slack...");
  const messages = await fetchAllMessages(channelId);
  console.log(`Total messages on Slack: ${messages.length}`);

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Update reaction counts for existing memes and add new ones
  const slackMemes = [];
  let newCount = 0;
  let updatedCount = 0;

  for (const msg of messages) {
    const files = msg.files || [];
    const imageFiles = files.filter(
      (f) => f.mimetype && f.mimetype.startsWith("image/")
    );
    if (imageFiles.length === 0) continue;

    const artist = await resolveUser(msg.user);
    const reactions = getReactionCount(msg);
    const date = new Date(parseFloat(msg.ts) * 1000).toISOString();

    for (const file of imageFiles) {
      const id = `${msg.ts}-${file.id}`;
      const ext = path.extname(file.name || ".jpg") || ".jpg";
      const filename = `${msg.ts}-${file.id}${ext}`;
      const localPath = path.join(IMAGES_DIR, filename);

      try {
        if (!fs.existsSync(localPath)) {
          const url = file.url_private_download || file.url_private;
          await downloadFile(url, localPath);
          console.log(`Downloaded: ${filename}`);
        }

        slackMemes.push({ id, imageUrl: `images/${filename}`, artist, reactions, date });

        if (existingIds.has(id)) {
          updatedCount++;
        } else {
          newCount++;
        }
      } catch (err) {
        console.error(`Failed to download ${file.name}: ${err.message}`);
      }
    }
  }

  // Merge: keep all existing memes (even if deleted from Slack), update ones still on Slack
  const slackIds = new Set(slackMemes.map((m) => m.id));
  const merged = [];

  // Add memes still on Slack with fresh reaction counts
  for (const meme of slackMemes) {
    merged.push(meme);
  }

  // Preserve memes that were deleted from Slack (the whole point!)
  let preservedCount = 0;
  for (const meme of existing) {
    if (!slackIds.has(meme.id)) {
      merged.push(meme);
      preservedCount++;
    }
  }

  merged.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(
    path.join(__dirname, "memes.json"),
    JSON.stringify(merged, null, 2)
  );
  console.log(`\nDone!`);
  console.log(`  ${newCount} new memes added`);
  console.log(`  ${updatedCount} existing memes updated`);
  console.log(`  ${preservedCount} archived memes preserved (no longer on Slack)`);
  console.log(`  ${merged.length} total memes in memes.json`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
