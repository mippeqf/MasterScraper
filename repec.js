const Fuse = require("fuse.js");
const csv = require("csvtojson");
const { distance, closest } = require("fastest-levenshtein");

const sheet = csv({ noheader: false, delimiter: ";" })
   .fromFile("C:/Users/Markus/Desktop/FinMasters.csv")
   .then((masters) => {
      const mastersarr = masters.map((obj) => obj.uni);
      console.log(mastersarr.slice(0, 10));
      const repec = csv({ noheader: false, delimiter: ";" })
         .fromFile("C:/Users/Markus/Desktop/repec.csv")
         .then((repecin) => {
            const repec = repecin.map((i) => {
               return {
                  school: i.school.replace("Department of Economics", ""),
                  rank: i.rank,
               };
            });
            for (const uni in repec) {
               console.log(
                  repec[uni].school.replace(/Economics|Department|of|,|/gi, ""),
                  " ------- ",
                  closest(
                     repec[uni].school.replace(
                        /Economics|Department|of|,|/gi,
                        ""
                     ),
                     mastersarr
                  )
               );
               // const fuse = new Fuse(masters, {
               //    includeScore: true,
               //    keys: ["uni"],
               //    ignoreLocation: true,
               // });
               // let res = fuse.search(repec[uni].school);
               // res.sort((a, b) => a.score - b.score);
               // console.log(
               //    repec[uni].school,
               //    "--",
               //    repec[uni].rank,
               //    "    -----    ",
               //    res.slice(0, 3).map((i) => {
               //       return {
               //          uni: i.item.uni,
               //          score: i.score,
               //       };
               //    })
               // );
            }
         });
   });
