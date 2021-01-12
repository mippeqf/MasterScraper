// For debugging of single URLs, change link in line 46

const puppeteer = require("puppeteer");

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
      "#QuickFacts > div > div:nth-child(3) > div > div.LabelContainer > div.Title > div > div:not(.Hidden) > time",
   startDate:
      "#QuickFacts > div > div:nth-child(4) > div > div.LabelContainer > div.Title > div > div:not(.Hidden) > time",
};

(async () => {
   const browser = await puppeteer.launch({ headless: true });
   const page = await browser.newPage();
   page.setViewport({ width: 1000, height: 1000 });
   const prog = {
      link: "https://www.mastersportal.com/studies/37198/",
   };

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
      console.log(datePairs[info]);
      if (!!(await page.$(datePairs[info]))) {
         record[info] = await page.$eval(datePairs[info], (res) => {
            console.log(res.getAttribute("datetime"));
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

   console.log(record);
   await browser.close();
})();
