const ObjectsToCsv = require("objects-to-csv");
const puppeteer = require("puppeteer");
const cliProgress = require("cli-progress");

const keySelectorPairs = {
   uni: "div.OrganisationName > h2",
   title:
      "#Hero > div.EssentialInformationWrapper.mdc-layout-grid.GridInContainer > section > div > header > h1",
   degType:
      "#Hero > div.EssentialInformationWrapper.mdc-layout-grid.GridInContainer > section > div > div.Content > div > span:nth-child(1)",
   campus:
      "#Hero > div.EssentialInformationWrapper.mdc-layout-grid.GridInContainer > section > div > div.Content > div > span:nth-child(2)",
   duration:
      "#QuickFacts > div > div:nth-child(1) > div > div.LabelContainer > div.Title > span",
   tuition:
      "#QuickFacts > div > div:nth-child(2) > div > div.LabelContainer > div.Title > div > div:nth-child(2) > span",
   about: "#StudySummary > p",
   uniRank: "#js-worldRankingReadMoreButton > span.ValueAndType > span.Value",
   languages:
      "#StudyKeyFacts > article.FactItem.LanguageFact.js-languageFact > div",
   ects: "#StudyKeyFacts > article:nth-child(5) > div",
   //  disciplines:
   //     "#StudyKeyFacts > article.FactItem.Disciplines > a.TextOnly:not(.LandingPageLink)",
   city:
      "#OrganisationInformation > header > span > div > span > a:nth-child(1)",
   country:
      "#OrganisationInformation > header > span > div > span > a:nth-child(3)",
   toefl:
      "#EnglishRequirements > section > div.CardContents.TOEFLCard.js-CardTOEFL > div > div.ScoreInformationContainer",
   ielts:
      "#EnglishRequirements > section > div.CardContents.IELTSCard.js-CardIELTS > div > div.ScoreInformationContainer",
   gmat:
      "#AcademicRequirements > section > div.CardContents.GMATCard.js-CardGMAT > div > div.ScoreInformationContainer",
   gre:
      "#AcademicRequirements > section > div.CardContents.GRECard.js-CardGRE > div > div.ScoreInformationContainer",
};

const hrefPairs = {
   origLink:
      "#Hero > div.EssentialInformationWrapper.mdc-layout-grid.GridInContainer > section > div > header > h1 > a",
};
const datePairs = {
   applyBy:
      "#QuickFacts > div > div:nth-child(3) > div > div.LabelContainer > div.Title > div > div:not(.Hidden) > time",
   startDate:
      "#QuickFacts > div > div:nth-child(4) > div > div.LabelContainer > div.Title > div > div:not(.Hidden) > time",
};

const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const outname = "econall.csv";

// Fin All
// const starturl =
//    "https://www.mastersportal.com/search/#q=lv-master|tc-EUR|di-87&start=";

// Econ all
const starturl =
   "https://www.mastersportal.com/search/#q=di-4|lv-master|tc-EUR&start=";

// Econometrics all
const starturl =
   "https://www.mastersportal.com/search/#q=di-110|lv-master|tc-EUR&start=";

(async () => {
   async function restartBrowser() {
      await context.close();
      context = await browser.createIncognitoBrowserContext();
      page = await context.newPage();
      // page.setViewport({ width: 1200, height: 1200 });
      // page.waitForTimeout(3000);
   }

   const browser = await puppeteer.launch({ headless: true });
   let context = await browser.createIncognitoBrowserContext();
   let page = await context.newPage();
   await page.goto(starturl + "00");
   await page.waitForSelector("div.ResultsNum");
   const links = [];
   const max = Number(
      await page.$eval("div.ResultsNum", (text) => {
         let res = text.innerText.trim().split(" ").pop();
         return res.replace(",", "").replace(".", "");
      })
   );

   console.log("Fetching links");
   bar1.start(max, 0);
   for (i = 0; i < max; i += 10) {
      bar1.increment(10);
      if (i % 100 == 0) {
         await restartBrowser();
      }
      const url = starturl + i;
      await page.goto(url);
      await page.waitForSelector("a.Result");
      links.push(
         ...(await page.$$eval("a.Result", (arr) =>
            arr.map((res) => {
               return { link: res.href };
            })
         ))
      );
   }
   bar1.stop();
   const data = [];

   console.log("Scraping data");
   bar1.start(links.length, 0);
   for (prog of links) {
      bar1.increment();
      if (links.indexOf(prog) % 10 === 0) {
         await restartBrowser();
      }
      await page.goto(prog.link);
      let record = { platformLink: prog.link };

      // Regular innerText values
      for (let info in keySelectorPairs) {
         if (await page.$(keySelectorPairs[info])) {
            record[info] = await page.$eval(
               keySelectorPairs[info],
               (res) => res.innerText
            );
         } else {
            record[info] = ".";
         }
      }

      // Href values
      for (let info in hrefPairs) {
         if (await page.$(hrefPairs[info])) {
            record[info] = await page.$eval(hrefPairs[info], (res) => res.href);
         } else {
            record[info] = ".";
         }
      }

      // Date values
      for (let info in datePairs) {
         if (!!(await page.$(datePairs[info]))) {
            record[info] = await page.$eval(datePairs[info], (res) => {
               let date = new Date(res.getAttribute("datetime"));
               return date.toLocaleDateString("German");
            });
         } else {
            record[info] = ".";
         }
      }

      // Misc manual cases
      if (
         !!(await page.$(
            "#StudyKeyFacts > article.FactItem.Disciplines > a.TextOnly:not(.LandingPageLink)"
         ))
      ) {
         record.disciplines = await page.$$eval(
            "#StudyKeyFacts > article.FactItem.Disciplines > a.TextOnly:not(.LandingPageLink)",
            (res) => res.map((r) => r.innerText).join(", ")
         );
      } else {
         record.disciplines = ".";
      }
      if (
         !!(await page.$(
            "#QuickFacts > div > div:nth-child(2) > div > div.LabelContainer > div.Title > div > div:nth-child(2) > span.CurrencyContainer"
         ))
      ) {
         record.tuitiontype = await page.$$eval(
            "#QuickFacts > div > div:nth-child(2) > div > div.LabelContainer > div.Title > div > div:nth-child(2) > span.CurrencyContainer",
            (res) => res.map((r) => r.innerText.split("/")[1])
         );
      } else {
         record.tuitiontype = ".";
      }

      data.push(record);
   }

   bar1.stop();

   await browser.close();
   const csv = new ObjectsToCsv(data);
   await csv.toDisk("./" + outname);
})();

// Free finance
// const starturl =
//    "https://www.mastersportal.com/search/#q=di-87|lv-master|rg-1|tc-EUR|tr-[0,500]&start=";
// No budget constraint econ
// const starturl = "https://www.mastersportal.com/search/#q=di-4|lv-master&start="
// Free econ
// const starturl =
//    "https://www.mastersportal.com/search/#q=di-4|lv-master|tc-EUR|tr-[0,500]&start=";
// Econ .5-5k pa
// const starturl =
//    "https://www.mastersportal.com/search/#q=di-4|lv-master|tc-EUR|tr-[500,1000],[1000,5000]&start=";
