const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

// Bir URL'den geçerli klasör ismi oluşturma
function createFolderName(url) {
    return url.replace(/https?:\/\//, "").replace(/[\/:<>*?"|]/g, "_");
}

// Bir URL'den veri indiren yardımcı fonksiyon
async function downloadFile(url, filePath) {
    try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        await fs.writeFile(filePath, response.data);
        console.log(`Dosya indirildi: ${filePath}`);
    } catch (error) {
        console.error(`Dosya indirilemedi: ${url}, Hata: ${error.message}`);
    }
}

// Ana kopyalama işlevi
async function copyWebsite(url) {
    try {
        console.log("Web sitesi kopyalanıyor...");

        // İndirilecek klasör oluştur
        const folderName = createFolderName(url);
        const websiteDir = path.join(__dirname, "indirilenler", folderName);
        fs.ensureDirSync(websiteDir);

        // HTML içeriği al
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        // Ana HTML dosyasını kaydet
        const mainHtmlPath = path.join(websiteDir, "index.html");
        await fs.writeFile(mainHtmlPath, html);
        console.log("HTML kaydedildi!");

        // CSS, JS ve görselleri indir
        const assets = [];
        $("link[rel='stylesheet']").each((i, el) => {
            const href = $(el).attr("href");
            if (href) assets.push(new URL(href, url).href);
        });
        $("script[src]").each((i, el) => {
            const src = $(el).attr("src");
            if (src) assets.push(new URL(src, url).href);
        });
        $("img[src]").each((i, el) => {
            const src = $(el).attr("src");
            if (src) assets.push(new URL(src, url).href);
        });

        // Asset'leri indir ve kaydet
        for (const asset of assets) {
            const assetUrl = new URL(asset, url);
            const filePath = path.join(websiteDir, path.basename(assetUrl.pathname));
            await downloadFile(asset, filePath);
        }

        console.log(`Tüm dosyalar başarıyla indirildi: ${websiteDir}`);
    } catch (error) {
        console.error("Web sitesi kopyalanırken hata oluştu:", error.message);
    }
}

// Kullanıcıdan URL alma
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

readline.question("Hangi URL'yi kopyalamak istersiniz? ", async (url) => {
    await copyWebsite(url);
    readline.close();
});
