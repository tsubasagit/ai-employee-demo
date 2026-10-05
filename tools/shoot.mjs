import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
// 使い方: npm i puppeteer-core && node tools/shoot.mjs（Chrome の場所は executablePath を書き換える）

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const APP = path.resolve(HERE, "..");
const OUT = path.join(APP, "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const file = u === "/" ? path.join(HERE, "frame.html") : u.startsWith("/app/") ? path.join(APP, u.slice(5)) : null;
  if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  fs.createReadStream(file).pipe(res);
}).listen(8991);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true, args: ["--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
await page.goto("http://127.0.0.1:8991/", { waitUntil: "networkidle0" });
const fr = await (await page.$("#app")).contentFrame();
await fr.evaluate(() => {
  localStorage.clear();
  const s = document.createElement("style");
  s.textContent = ".demo{display:none} .note{display:none} .wrap{padding-top:20px}";
  document.head.appendChild(s);
});

const wait = ms => new Promise(r => setTimeout(r, ms));
const TOTAL = 6;
const scene = (n, title, desc, pts) => page.evaluate((...a) => window.setScene(...a), n, TOTAL, title, desc, pts);
const tab = i => fr.evaluate(i => document.querySelectorAll(".tab")[i].click(), i);
const ask = async q => { await fr.evaluate(q => { const p = document.querySelector(".panel.on"); p.querySelector(".ask input").value = q; p.querySelector("form").requestSubmit(); }, q); await wait(1300); };
const snap = async name => { await wait(300); await page.screenshot({ path: path.join(OUT, name) }); console.log("saved", name); };

// 01 社員紹介
await tab(0);
await scene(1, "AI社員が、<br>チームの一員になります",
  "人の社員10名と並んで、担当を持ったAI社員が働きます。会社のことを学習して、24時間その場で答えます。",
  ["案内・見積もり・採用など、係ごとに配属", "社員紹介と同じ画面で、誰に聞けばいいかが分かる", "最短1週間で配属できます"]);
await snap("01_社員紹介.png");

// 02 案内係
await tab(1);
await ask("どんな会社か、会社概要を教えて");
await scene(2, "お客様の質問に、<br>いつでも答えます",
  "設立・所在地・事業内容など、よく聞かれることは案内係がすぐに答えます。夜間や休日の問い合わせも取りこぼしません。",
  ["ホームページや資料の内容をそのまま学習", "営業時間外でも、その場で回答", "電話対応の時間を減らせます"]);
await snap("02_案内係_会社概要.png");

// 03 見積もり係
await tab(2);
await ask("トイレ交換はいくら？");
await ask("工期はどれくらい？");
await scene(3, "担当ごとに、<br>専門のAI社員を置けます",
  "費用の目安や工期は見積もり係が答えます。採用のことは採用係へ。係を分けるので、答えがぶれません。",
  ["料金表・工事の流れを学習", "正式な見積もりは営業担当へ", "係どうしで案内し合います"]);
await snap("03_見積もり係.png");

// 04 引き継ぎ
await tab(1);
await ask("工事を相談したいです。連絡先を教えて");
await scene(4, "決められないことは、<br>担当者へつなぎます",
  "AI社員が受けた相談は、Slack／Teamsで担当者に引き継ぎます。人が判断すべきことは、人が判断します。",
  ["重要な操作は事前承認制", "学習範囲は契約時に限定", "やり取りはすべて記録"]);
await snap("04_担当者への引き継ぎ.png");

// 05 AI社員を追加
await fr.evaluate(() => {
  document.querySelector(".tab.add").click();
  document.querySelectorAll("#presets button")[0].click();
});
await scene(5, "必要な係は、<br>現場で増やせます",
  "「点検の予約を受けてほしい」と思ったら、名前と担当、よくある質問を入れるだけ。新しいAI社員のタブができます。",
  ["ひな形から数分で作成", "社外向け・社内向けのどちらにも", "作ったあとも編集できます"]);
await snap("05_AI社員を追加.png");

// 06 質問を追加
await fr.evaluate(() => document.getElementById("cancel").click());
await tab(3);
await ask("休日は？");
await fr.evaluate(() => {
  document.querySelector(".panel.on .chips .plus").click();
  document.getElementById("qLabel").value = "寮はある？";
  document.getElementById("qKeys").value = "寮, 住まい, 引っ越し";
  document.getElementById("qAns").value = "会社から徒歩5分に社宅が2部屋あります。入居の相談は採用担当の山本へどうぞ。";
});
await scene(6, "覚えてほしいことは、<br>その場で教えられます",
  "答えられなかった質問は、会話画面から質問と答えを足すだけで次から答えます。毎月のチューニングで精度も上げていきます。",
  ["質問はボタンにもなり、お客様が押せる", "月次の精度チューニング付き", "活用レポートで効果を確認"]);
await snap("06_質問を追加.png");

await browser.close();
server.close();
