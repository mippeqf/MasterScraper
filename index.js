const { linkSync, link } = require("fs");
const ObjectsToCsv = require("objects-to-csv");
const puppeteer = require("puppeteer");
const cliProgress = require("cli-progress");
const moment = require("moment");

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
};

const hrefPairs = {
   origLink:
      "#Hero > div.EssentialInformationWrapper.mdc-layout-grid.GridInContainer > section > div > header > h1 > a",
};
const datePairs = {
   applyBy:
      "#QuickFacts > div > div:nth-child(3) > div > div.LabelContainer > div.Title > div > div:nth-child(1):not(.Hidden) > time",
   startDate:
      "#QuickFacts > div > div:nth-child(4) > div > div.LabelContainer > div.Title > div > div:nth-child(1):not(.Hidden) > time",
};

const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

(async () => {
   const browser = await puppeteer.launch();
   const page = await browser.newPage();
   page.setViewport({ width: 1000, height: 2000 });
   await page.goto(
      "https://www.mastersportal.com/search/#q=di-4|lv-master&start=00"
   );
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
      const url = `https://www.mastersportal.com/search/#q=di-4|lv-master&start=${i}`;
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
            record[info] = await page.$eval(datePairs[info], (res) =>
               moment(res.getAttribute("datetime")).format("DD.MM.YYYY")
            );
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
      data.push(record);
   }

   bar1.stop();

   await browser.close();
   const csv = new ObjectsToCsv(data);
   await csv.toDisk("./data.csv");
})();
